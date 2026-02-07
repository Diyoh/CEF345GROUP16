/**
 * AUTH CONTROLLER
 * Handles logic for user registration, login, and profile fetching.
 */

import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
        secure: process.env.NODE_ENV === 'production', // Use SSL in production
        sameSite: 'strict' // CSRF protection
    };

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
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
        const [codes] = await pool.query('SELECT * FROM access_codes WHERE code = ? AND is_used = FALSE', [accessCode]);
        
        if (codes.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid or used access code' });
        }

        const role = codes[0].role;
        const [users] = await pool.query('SELECT email FROM users WHERE email = ?', [email]);
        if (users.length > 0) {
            return res.status(400).json({ success: false, error: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // [CUSTOM ID GENERATION]
        // Format: dev1, con1, adm1
        let prefix = 'user';
        if (role === 'DEVELOPER_ADMIN') prefix = 'dev';
        else if (role === 'CONTRACTOR') prefix = 'con';
        else if (role === 'ADMIN') prefix = 'adm';

        // Find the latest ID with this prefix to determine the next number
        // We look for IDs starting with the prefix and order by length (to handle dev9 vs dev10) and then value
        const [lastUser] = await pool.query(
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

        await pool.query(
            'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
            [nextId, name, email, passwordHash, role]
        );

        await pool.query('UPDATE access_codes SET is_used = TRUE WHERE code = ?', [accessCode]);

        const [newUser] = await pool.query('SELECT id, name, email, role FROM users WHERE email = ?', [email]);
        
        // Return Cookie
        sendTokenResponse(newUser[0], 201, res);

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Please provide email and password' });
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
        httpOnly: true
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const getMe = async (req, res) => {
    res.json({
        success: true,
        data: req.user
    });
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
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
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
