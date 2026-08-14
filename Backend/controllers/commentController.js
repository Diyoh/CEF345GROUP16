import { randomUUID } from 'crypto';
import pool from '../config/db.js';
import { saveBase64Image } from '../utils/fileHandler.js';

export const getComments = async (req, res) => {
    try {
        const projectId = req.params.id;
        const [comments] = await pool.query('SELECT * FROM comments WHERE project_id = ? ORDER BY created_at DESC', [projectId]);

        // Load every comment's images in ONE query rather than one query per comment.
        if (comments.length > 0) {
            const ids = comments.map(c => c.id);
            const [rows] = await pool.query(
                `SELECT comment_id, image_url FROM comment_images WHERE comment_id IN (${ids.map(() => '?').join(',')})`,
                ids
            );

            const imagesByComment = new Map();
            for (const row of rows) {
                if (!imagesByComment.has(row.comment_id)) imagesByComment.set(row.comment_id, []);
                imagesByComment.get(row.comment_id).push(row.image_url);
            }

            for (const c of comments) c.images = imagesByComment.get(c.id) || [];
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
        // authorName is deliberately NOT read from the request. Citizen reports are
        // anonymous: collecting no name means there is none to leak, and it removes the
        // impersonation vector where an unauthenticated caller could file a report under
        // anyone's name. See Database/migrations/002_anonymous_citizen_reports.sql.
        const { authorType, text, images } = req.body;

        if (!String(text || '').trim()) {
            return res.status(400).json({ success: false, error: 'Comment text is required' });
        }

        const [projects] = await pool.query('SELECT id FROM projects WHERE id = ?', [projectId]);
        if (projects.length === 0) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        // Generate the id in Node instead of with SQL UUID(). The old code inserted the
        // row and then re-SELECTed "the newest comment by this author" to learn its id,
        // which attaches images to the WRONG comment whenever two people post under the
        // same name at the same time — and comments are unauthenticated, so names repeat.
        const commentId = randomUUID();

        await pool.query(
            'INSERT INTO comments (id, project_id, author_name, author_type, text) VALUES (?, ?, ?, ?, ?)',
            [commentId, projectId, null, authorType === 'NGO' ? 'NGO' : 'Citizen', text]
        );

        if (Array.isArray(images) && images.length > 0) {
            for (const imgBase64 of images) {
                const imageUrl = await saveBase64Image(imgBase64, 'comments');
                if (imageUrl) {
                    await pool.query(
                        'INSERT INTO comment_images (id, comment_id, image_url) VALUES (?, ?, ?)',
                        [randomUUID(), commentId, imageUrl]
                    );
                }
            }
        }

        const [rows] = await pool.query('SELECT * FROM comments WHERE id = ?', [commentId]);
        res.status(201).json({ success: true, data: rows[0] });

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
