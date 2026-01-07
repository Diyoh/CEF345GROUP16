import pool from '../config/db.js';

export const getTeam = async (req, res) => {
    try {
        const [members] = await pool.query('SELECT * FROM team_members');
        res.json({ success: true, data: members });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

export const updateTeamMember = async (req, res) => {
    try {
        const { name, role, bio, imageUrl } = req.body;
        const id = req.params.id;
        
        await pool.query(
            'UPDATE team_members SET name = ?, role = ?, bio = ?, image_url = ? WHERE id = ?',
            [name, role, bio, imageUrl, id]
        );
        res.json({ success: true, message: 'Team member updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
