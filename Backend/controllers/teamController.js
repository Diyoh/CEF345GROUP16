import pool from '../config/db.js';

export const getTeam = async (req, res) => {
    try {
        const [members] = await pool.query('SELECT * FROM team_members');
        res.json({ success: true, data: members });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

import { saveBase64Image } from '../utils/fileHandler.js';

export const createTeamMember = async (req, res) => {
    try {
        const { name, role, bio } = req.body;
        
        let imageUrl = '';
        if (req.file) {
            imageUrl = req.file.path;
        } else if (req.body.imageUrl && req.body.imageUrl.startsWith('data:image')) {
            imageUrl = await saveBase64Image(req.body.imageUrl, 'team');
        }

        const [result] = await pool.query(
            'INSERT INTO team_members (id, name, role, bio, image_url) VALUES (UUID(), ?, ?, ?, ?)',
            [name, role, bio, imageUrl]
        );
        
        // Fetch the created member to return
        const [rows] = await pool.query('SELECT * FROM team_members WHERE name = ? ORDER BY created_at DESC LIMIT 1', [name]); // Ideally user ID or UUID if we had it from insert (MySQL UUID() makes this tricky without a stored function or querying back)
        // Actually, for UUID(), we often generate it in JS or just query back. 
        // Simple fix: just return success, client re-fetches. OR generate UUID in JS.
        // Let's rely on client re-fetch or optimistically add.
        
        res.status(201).json({ success: true, message: 'Team member added' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

export const updateTeamMember = async (req, res) => {
    try {
        const { name, role, bio } = req.body;
        const id = req.params.id;
        
        let finalImageUrl = req.body.imageUrl;
        
        if (req.file) {
            finalImageUrl = req.file.path;
        } else if (req.body.imageUrl && req.body.imageUrl.startsWith('data:image')) {
             finalImageUrl = await saveBase64Image(req.body.imageUrl, 'team');
        }

        await pool.query(
            'UPDATE team_members SET name = ?, role = ?, bio = ?, image_url = ? WHERE id = ?',
            [name, role, bio, finalImageUrl, id]
        );
        res.json({ success: true, message: 'Team member updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

export const deleteTeamMember = async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query('DELETE FROM team_members WHERE id = ?', [id]);
        res.json({ success: true, message: 'Team member removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
