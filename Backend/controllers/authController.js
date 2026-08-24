/**
 * AUTH CONTROLLER
 * Handles logic for user registration, login, and profile fetching.
 */

import pool, { withTransaction } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError, sendError } from '../utils/AppError.js';
import { randomCode, groupCode } from '../utils/secureCodes.js';

/**
 * Helper function to generate a JSON Web Token (JWT)
 */
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

/**
 * [SECURITY FIX] Helper to send Token as HttpOnly Cookie
 */
const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user.id);

    const options = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Days
        httpOnly: true, // [SECURITY] JS cannot access this cookie on client
        secure: true,   // [CRITICAL] Must be true for SameSite=None
        sameSite: 'none' // [CRITICAL] Required for Cross-Origin (Vercel -> Render)
    };

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                entityId: user.entityId || user.entity_id || null,
                // Present exactly once, on registration of an account that gets
                // one. Never retrievable again: only its hash exists after this.
                pcn: user.pcn
                // Token is NOT sent in JSON anymore
            }
        });
};

export const register = async (req, res) => {
    const { name, email, password, accessCode } = req.body;

    if (!name || !email || !password || !accessCode) {
        return res.status(400).json({ success: false, error: 'Please provide all fields' });
    }

    try {
        /**
         * Claiming a code, creating the user and burning the code are ONE unit.
         *
         * Two problems this closes:
         *  1. Non-atomic writes — a failure between INSERT user and UPDATE access_codes left
         *     a spent code still marked available, so the same grant could be claimed twice.
         *  2. A check-then-act race — two people submitting the same code at once both saw
         *     is_used = FALSE and both registered. SELECT ... FOR UPDATE holds a row lock for
         *     the length of the transaction, so the second request waits and then correctly
         *     sees the code as used.
         *
         * The id counter has the same shape of race, and the same lock serialises it.
         */
        const newUser = await withTransaction(async (tx) => {
            const [codes] = await tx.query(
                'SELECT * FROM access_codes WHERE code = ? AND is_used = FALSE FOR UPDATE',
                [accessCode]
            );

            if (codes.length === 0) {
                throw new AppError('Invalid or used access code', 400);
            }

            const role = codes[0].role;

            // An ENTITY_ADMIN account exists to run one institution; a code
            // without one is a misissued code, refused rather than guessed at.
            const entityId = codes[0].entity_id || null;
            if (role === 'ENTITY_ADMIN' && !entityId) {
                throw new AppError('This access code is not bound to an institution', 400);
            }

            const [users] = await tx.query('SELECT email FROM users WHERE email = ?', [email]);
            if (users.length > 0) {
                throw new AppError('User already exists', 400);
            }

            assertPasswordAcceptable(password);

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // [CUSTOM ID GENERATION]
            // Format: dev1, con1, adm1
            let prefix = 'user';
            if (role === 'DEVELOPER_ADMIN') prefix = 'dev';
            else if (role === 'CONTRACTOR') prefix = 'con';
            else if (role === 'PLATFORM_ADMIN') prefix = 'adm';
            else if (role === 'ENTITY_ADMIN') prefix = 'ent';

            // Find the latest ID with this prefix to determine the next number.
            // Ordered by length first so dev10 sorts after dev9 rather than before it.
            const [lastUser] = await tx.query(
                `SELECT id FROM users WHERE id LIKE ? ORDER BY LENGTH(id) DESC, id DESC LIMIT 1`,
                [`${prefix}%`]
            );

            let nextId = `${prefix}1`; // Default if none exist

            if (lastUser.length > 0) {
                const lastId = lastUser[0].id;
                // Extract the number part: 'dev12' -> 12
                const numberPart = parseInt(lastId.replace(prefix, ''));
                if (!isNaN(numberPart)) {
                    nextId = `${prefix}${numberPart + 1}`;
                }
            }

            // The Private Confirmation Number: the second factor on every
            // financial action from phase G3. Generated here, hashed like a
            // password, and RETURNED EXACTLY ONCE in this response. Entity
            // administrators and contractors are the accounts that will move
            // records of money, so they are the ones that get it.
            const needsPcn = role === 'ENTITY_ADMIN' || role === 'CONTRACTOR';
            const pcnRaw = needsPcn ? randomCode(12) : null;
            const pcnHash = pcnRaw ? await bcrypt.hash(pcnRaw, salt) : null;

            await tx.query(
                'INSERT INTO users (id, name, email, password_hash, role, entity_id, pcn_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [nextId, name, email, passwordHash, role, entityId, pcnHash]
            );

            // Every contractor account opens with a pending verification file,
            // so the MINTP queue is the single place new companies surface.
            if (role === 'CONTRACTOR') {
                await tx.query(
                    'INSERT INTO contractor_profiles (user_id, company_name) VALUES (?, ?)',
                    [nextId, name]
                );
            }

            await tx.query('UPDATE access_codes SET is_used = TRUE WHERE code = ?', [accessCode]);

            return { id: nextId, name, email, role, entityId, pcn: pcnRaw ? groupCode(pcnRaw) : undefined };
        });

        // Return Cookie
        sendTokenResponse(newUser, 201, res);

    } catch (error) {
        sendError(res, error);
    }
};

// The login form asks the person to state who they are. The statement is
// checked, not trusted: if the declared role does not match the account, the
// login is refused even with correct credentials. This catches the everyday
// mistake (a contractor on the administrator tab) before it becomes a support
// question, and it costs an attacker one more thing to know.
const LOGIN_ROLES = ['PLATFORM_ADMIN', 'ENTITY_ADMIN', 'CONTRACTOR', 'DEVELOPER_ADMIN'];

export const login = async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }
    if (role !== undefined && !LOGIN_ROLES.includes(role)) {
        return res.status(400).json({ success: false, error: 'Unknown role' });
    }

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // The declared role must match the account. Checked only after the
        // password, so this message never leaks whether credentials were right
        // for some other role of a guessed account.
        if (role !== undefined && user.role !== role) {
            return res.status(403).json({ success: false, error: 'This account is not registered under the role you selected' });
        }

        // Return Cookie
        sendTokenResponse(user, 200, res);

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * [SECURITY FIX] Logout
 * Clears the HttpOnly cookie.
 */
export const logout = async (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const getMe = async (req, res) => {
    res.json({
        success: true,
        data: req.user
    });
};

/**
 * Minimum password policy, enforced server-side.
 *
 * The frontend checked 6 characters on the registration form only, and the API checked
 * nothing at all — so the change-password endpoint accepted a single character, and any
 * non-browser client could set anything. These accounts can alter the public spending
 * record, so the floor belongs on the server where it cannot be bypassed.
 *
 * Length over composition rules: mandatory symbol classes push people toward predictable
 * substitutions, while length is what actually resists guessing.
 */
const MIN_PASSWORD_LENGTH = 8;

const assertPasswordAcceptable = (password) => {
    const value = String(password || '');
    if (value.length < MIN_PASSWORD_LENGTH) {
        throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
    }
    if (/^\s+$/.test(value)) {
        throw new AppError('Password cannot be only spaces', 400);
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        assertPasswordAcceptable(newPassword);

        // 1. Get user with password hash
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
        
        const user = users[0];

        // 2. Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'Incorrect current password' });
        }

        // 3. Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // 4. Update DB
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        // sendError maps AppError (the policy rejection above) to its own status; anything
        // unexpected still becomes a logged 500.
        sendError(res, error);
    }
};
