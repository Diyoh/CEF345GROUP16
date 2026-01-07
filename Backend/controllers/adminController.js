import pool from '../config/db.js';

export const generateAccessCode = async (req, res) => {
    try {
        const { role } = req.body;
        const code = `${role.substring(0, 5)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        await pool.query(
            'INSERT INTO access_codes (code, role, generated_by_user_id) VALUES (?, ?, ?)',
            [code, role, req.user.id]
        );

        res.status(201).json({ success: true, data: { code, role } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

export const getAccessCodes = async (req, res) => {
    try {
        const [codes] = await pool.query('SELECT * FROM access_codes ORDER BY created_at DESC');
        res.json({ success: true, data: codes });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
