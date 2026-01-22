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
        const [contractors] = await pool.query(
            'SELECT id, name, email, role FROM users WHERE role = ?', 
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
