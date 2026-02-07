import pool from '../config/db.js';
import { saveBase64Image } from '../utils/fileHandler.js';

export const getComments = async (req, res) => {
    try {
        const projectId = req.params.id;
        const [comments] = await pool.query('SELECT * FROM comments WHERE project_id = ? ORDER BY created_at DESC', [projectId]);

        for (let c of comments) {
            const [images] = await pool.query('SELECT image_url FROM comment_images WHERE comment_id = ?', [c.id]);
            c.images = images.map(img => img.image_url);
        }

        res.json({ success: true, data: comments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

export const createComment = async (req, res) => {
    try {
        const projectId = req.params.id;
        const { authorName, authorType, text, images } = req.body;

        // 1. Insert Comment
        // Note: Using UUID() in SQL means we need to fetch the ID back.
        // Alternate: Generate UUID in Node.
        // For now, insert and fetch latest by author/time is approximation or just trust the flow.
        await pool.query(
            'INSERT INTO comments (id, project_id, author_name, author_type, text) VALUES (UUID(), ?, ?, ?, ?)',
            [projectId, authorName, authorType, text]
        );

        // Fetch back the new ID
        const [result] = await pool.query('SELECT id FROM comments WHERE project_id = ? AND author_name = ? ORDER BY created_at DESC LIMIT 1', [projectId, authorName]);
        const commentId = result[0].id;

        // 2. Handle Images
        if (images && images.length > 0) {
            for (const imgBase64 of images) {
                const imageUrl = await saveBase64Image(imgBase64, 'comments');
                if (imageUrl) {
                    await pool.query(
                        'INSERT INTO comment_images (comment_id, image_url) VALUES (?, ?)',
                        [commentId, imageUrl]
                    );
                }
            }
        }

        res.status(201).json({ success: true, message: 'Comment added' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

export const deleteComment = async (req, res) => {
    try {
        await pool.query('DELETE FROM comments WHERE id = ?', [req.params.commentId]);
        res.json({ success: true, message: 'Comment deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
