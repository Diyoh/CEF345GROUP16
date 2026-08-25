import pool from '../config/db.js';
import { randomCode } from '../utils/secureCodes.js';

/** Roles an access code may grant. Must match the users.role / access_codes.role ENUM. */
const ASSIGNABLE_ROLES = ['PLATFORM_ADMIN', 'ENTITY_ADMIN', 'CONTRACTOR', 'DEVELOPER_ADMIN'];

/**
 * Crockford-style alphabet: no 0/O, no 1/I/L. These codes get read off a screen and typed
 * into a phone, often transcribed by hand first, so ambiguous glyphs cost real support time.
 */
const CODE_LENGTH = 10; // 31^10 is about 2^49: brute force is not viable even without rate limiting

/**
 * generateSecureCode
 *
 * Uses crypto.randomInt, NOT Math.random. Math.random is a seeded PRNG with no
 * cryptographic guarantees: its output is predictable from prior outputs, and the previous
 * 6-character code carried roughly 31 bits with a guessable role prefix.
 *
 * This matters more here than almost anywhere else in the app: an access code IS the
 * authorization boundary. Guessing one grants a role — including ADMIN.
 */
const generateSecureCode = () => {
    const code = randomCode(CODE_LENGTH);
    // Grouped for legibility when read aloud or copied by hand.
    return `${code.slice(0, 5)}-${code.slice(5)}`;
};

export const generateAccessCode = async (req, res) => {
    try {
        const { role, entityId } = req.body;

        // Previously `role.substring(0,5)` threw a 500 when role was missing, and any
        // string was accepted as a role.
        if (!role || !ASSIGNABLE_ROLES.includes(role)) {
            return res.status(400).json({
                success: false,
                error: `Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`
            });
        }

        // An entity administrator is an administrator OF something. The code
        // carries the institution, so the account it mints cannot choose one.
        let boundEntityId = null;
        if (role === 'ENTITY_ADMIN') {
            if (!entityId) {
                return res.status(400).json({ success: false, error: 'An ENTITY_ADMIN code must name its institution' });
            }
            const [entities] = await pool.query(
                'SELECT id, type FROM gov_entities WHERE id = ?', [entityId]
            );
            if (entities.length === 0) {
                return res.status(400).json({ success: false, error: 'That institution does not exist' });
            }
            if (entities[0].type !== 'MINISTRY' && entities[0].type !== 'COUNCIL') {
                return res.status(400).json({ success: false, error: 'Administrators belong to a ministry or a council' });
            }
            boundEntityId = entities[0].id;
        }

        // The code no longer encodes the role it grants. A prefix like "ADMIN-" told an
        // attacker which codes were worth guessing.
        let code;
        for (let attempt = 0; attempt < 5; attempt++) {
            code = generateSecureCode();
            const [existing] = await pool.query('SELECT code FROM access_codes WHERE code = ?', [code]);
            if (existing.length === 0) break;
            code = null;
        }

        if (!code) {
            return res.status(500).json({ success: false, error: 'Could not allocate a unique code' });
        }

        await pool.query(
            'INSERT INTO access_codes (code, role, entity_id, generated_by_user_id) VALUES (?, ?, ?, ?)',
            [code, role, boundEntityId, req.user.id]
        );

        res.status(201).json({ success: true, data: { code, role, entityId: boundEntityId } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

export const getAccessCodes = async (req, res) => {
    try {
        // [STRICT PRIVACY] Every user sees ONLY the codes they created.
        const query = `
            SELECT ac.*, u.name as generatedBy 
            FROM access_codes ac
            LEFT JOIN users u ON ac.generated_by_user_id = u.id
            WHERE ac.generated_by_user_id = ?
            ORDER BY ac.created_at DESC
        `;
        
        const [codes] = await pool.query(query, [req.user.id]);
        res.json({ success: true, data: codes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

export const getContractors = async (req, res) => {
    try {
        // Verification status rides along so an assignment form can refuse an
        // unverified contractor before the server has to.
        const [contractors] = await pool.query(
            `SELECT u.id, u.name, u.email, u.role, cp.status AS verification_status
             FROM users u
             LEFT JOIN contractor_profiles cp ON cp.user_id = u.id
             WHERE u.role = ?`,
            ['CONTRACTOR']
        );
        res.json({ success: true, data: contractors });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

export const getContractorStats = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get Contractor Details
        const [user] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [id]);
        if (user.length === 0) return res.status(404).json({ success: false, error: 'Contractor not found' });

        // 2. Get Projects
        const [projects] = await pool.query('SELECT * FROM projects WHERE contractor_id = ?', [id]);

        // 3. Calculate Stats
        const totalProjects = projects.length;
        const totalBudget = projects.reduce((acc, p) => acc + (parseFloat(p.budget) || 0), 0);
        const totalSpent = projects.reduce((acc, p) => acc + (parseFloat(p.spent) || 0), 0);
        const avgProgress = totalProjects > 0 
            ? projects.reduce((acc, p) => acc + (parseFloat(p.progress) || 0), 0) / totalProjects 
            : 0;

        res.json({
            success: true,
            data: {
                contractor: user[0],
                stats: {
                    totalProjects,
                    totalBudget,
                    totalSpent,
                    avgProgress
                },
                projects
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
