import { randomUUID } from 'crypto';
import pool from '../config/db.js';
import { saveBase64Image } from '../utils/fileHandler.js';

export const getTeam = async (req, res) => {
    try {
        const [members] = await pool.query('SELECT * FROM team_members');
        res.json({ success: true, data: members });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

export const createTeamMember = async (req, res) => {
    try {
        const { name, role, bio } = req.body;

        if (!String(name || '').trim()) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }
        if (!String(role || '').trim()) {
            return res.status(400).json({ success: false, error: 'Role is required' });
        }

        let imageUrl = '';
        if (req.file) {
            imageUrl = req.file.path;
        } else if (req.body.imageUrl && req.body.imageUrl.startsWith('data:image')) {
            imageUrl = await saveBase64Image(req.body.imageUrl, 'team');
        }

        // Generating the id here removes the old read-back query, which sorted by a
        // `created_at` column that team_members does not have.
        const id = randomUUID();

        await pool.query(
            'INSERT INTO team_members (id, name, role, bio, image_url) VALUES (?, ?, ?, ?, ?)',
            [id, name, role, bio || null, imageUrl]
        );

        const [rows] = await pool.query('SELECT * FROM team_members WHERE id = ?', [id]);
        res.status(201).json({ success: true, data: rows[0] });
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
