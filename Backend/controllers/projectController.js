/**
 * PROJECT CONTROLLER
 * 
 * This controller handles all logic related to 'Projects'.
 * It receives requests from the 'routes', interacts with the MySQL database,
 * and sends back JSON responses.
 */

import pool from '../config/db.js';
import { saveBase64Image } from '../utils/fileHandler.js';

/**
 * Get All Projects
 * GET /api/v1/projects
 * 
 * WHY THIS QUERY IS COMPLEX:
 * 1. Filtering: We need to dynamically add 'WHERE' clauses based on ?status=...
 * 2. Joins: We JOIN with the 'users' table to get the name of the contractor, 
 *    instead of just having a 'contractor_id'.
 * 3. Pagination: We use LIMIT and OFFSET to only return a slice of data (e.g., 10 items).
 */
export const getProjects = async (req, res) => {
    try {
        // Extract query parameters from URL (e.g., ?status=Ongoing&page=1)
        const { status, search, limit = 10, page = 1 } = req.query;
        const offset = (page - 1) * limit; // Calculate SQL offset

        // Base Query: Select project fields AND the contractor's name
        let query = `
            SELECT p.*, u.name as contractorName 
            FROM projects p 
            LEFT JOIN users u ON p.contractor_id = u.id 
            WHERE 1=1
        `;
        // 'WHERE 1=1' is a common trick. It allows us to simply append 'AND ...' for every filter.
        
        const params = [];

        // Dynamic Filtering
        if (status && status !== 'All') {
            query += ' AND p.status = ?'; // '?' is a placeholder for prepared statements (Security: prevents SQL Injection)
            params.push(status);
        }

        if (search) {
            query += ' AND (p.title LIKE ? OR p.location LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        // Sorting (Newest first) and Pagination
        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));

        // Execute Query
        const [projects] = await pool.query(query, params);

        // Fetch "Main Image" for each project
        // Note: In a larger app, we might do this via a subquery or another JOIN for performance.
        for (let p of projects) {
            const [images] = await pool.query('SELECT image_url FROM project_images WHERE project_id = ? ORDER BY is_main_cover DESC, uploaded_at ASC', [p.id]);
            p.images = images.map(img => img.image_url);
        }

        res.json({ success: true, data: projects });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * Get Single Project
 * GET /api/v1/projects/:id
 * Fetches detailed info, images, and updates history.
 */
export const getProjectById = async (req, res) => {
    try {
        const [projects] = await pool.query(`
            SELECT p.*, u.name as contractorName 
            FROM projects p 
            LEFT JOIN users u ON p.contractor_id = u.id 
            WHERE p.id = ?
        `, [req.params.id]);

        if (projects.length === 0) return res.status(404).json({ success: false, error: 'Project not found' });

        const project = projects[0];

        // Fetch All Images
        const [images] = await pool.query('SELECT image_url FROM project_images WHERE project_id = ? ORDER BY is_main_cover DESC', [project.id]);
        project.images = images.map(img => img.image_url);

        // Fetch Timeline Updates
        const [updates] = await pool.query('SELECT * FROM project_updates WHERE project_id = ? ORDER BY update_date DESC', [project.id]);
        project.updates = updates;

        res.json({ success: true, data: project });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * Create Project
 * POST /api/v1/projects
 * Admin only. Creates a project and saves initial images.
 */
export const createProject = async (req, res) => {
    try {
        console.log('--- CREATE PROJECT REQUEST ---');
        console.log('Body:', req.body);
        console.log('Files:', req.files);

        const { title, description, location, region, budget, contractorId, startDate, completionDate, images } = req.body;

        // 1. Insert Project Data
        // UUID() generates the ID inside the database
        const [result] = await pool.query(
            'INSERT INTO projects (id, title, description, location, region, budget, contractor_id, start_date, completion_date) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description, location, region, budget, contractorId, startDate, completionDate]
        );
         
        // Retrieve the new ID (assumes titles are fairly unique or relies on latest created)
        const [newP] = await pool.query('SELECT id FROM projects WHERE title = ? ORDER BY created_at DESC LIMIT 1', [title]);
        const projectId = newP[0].id;

        // 2. Handle Image Uploads (From Cloudinary Middleware)
        // Multer with Cloudinary Storage automatically uploads files and populates req.files
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const imageUrl = file.path || file.secure_url; // Cloudinary URL
                const isMain = i === 0;

                await pool.query(
                    'INSERT INTO project_images (project_id, image_url, is_main_cover) VALUES (?, ?, ?)',
                    [projectId, imageUrl, isMain]
                );
            }
        }
        // Fallback for Base64 (if legacy frontend used)
        else if (images && images.length > 0 && Array.isArray(images)) {
             for (let i = 0; i < images.length; i++) {
                const isMain = i === 0;
                const imageUrl = await saveBase64Image(images[i], 'projects');
                
                if (imageUrl) {
                    await pool.query(
                        'INSERT INTO project_images (project_id, image_url, is_main_cover) VALUES (?, ?, ?)',
                        [projectId, imageUrl, isMain]
                    );
                }
            }
        }

        const newProjectData = { id: projectId, ...req.body };
        
        // [SOCKET] Emit event
        const io = req.app.get('io');
        io.emit('project:created', newProjectData);

        res.status(201).json({ success: true, data: newProjectData });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * Update Project
 * PATCH /api/v1/projects/:id
 * Used by Contractors (updates status/progress) or Admins (updates anything).
 */
export const updateProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const { status, progress, spent, description, newImages } = req.body;

        // Dynamic Query Building
        // Only updates the fields that are sent in the request body
        let query = 'UPDATE projects SET ';
        const params = [];
        
        if (status) { query += 'status = ?, '; params.push(status); }
        if (progress !== undefined) { query += 'progress = ?, '; params.push(progress); }
        if (spent !== undefined) { query += 'spent = ?, '; params.push(spent); }
        if (description) { query += 'description = ?, '; params.push(description); }
        
        // Finalize Query
        query = query.slice(0, -2); // Remove trailing comma
        query += ' WHERE id = ?';
        params.push(projectId);

        if (params.length > 1) { // At least one field + id
             await pool.query(query, params);
        }

        // Handle New Images added during update
        // Handle New Images (From Cloudinary Middleware)
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const imageUrl = file.path || file.secure_url;
                await pool.query(
                    'INSERT INTO project_images (project_id, image_url, is_main_cover) VALUES (?, ?, ?)',
                    [projectId, imageUrl, false]
                );
            }
        }
        // Fallback for Base64
        else if (newImages && newImages.length > 0 && Array.isArray(newImages)) {
            for (const imgBase64 of newImages) {
                const imageUrl = await saveBase64Image(imgBase64, 'projects');
                if (imageUrl) {
                    await pool.query(
                        'INSERT INTO project_images (project_id, image_url, is_main_cover) VALUES (?, ?, ?)',
                        [projectId, imageUrl, false]
                    );
                }
            }
        }

        // [SOCKET] Emit event
        const io = req.app.get('io');
        // We emit the ID so clients know which project to re-fetch or update
        // Optimally, we would return the full updated object, but for now ID is enough to trigger a refresh
        io.emit('project:updated', { id: projectId, ...req.body });

        res.json({ success: true, message: 'Project updated' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * Delete Project
 * DELETE /api/v1/projects/:id
 * Admin Only.
 */
export const deleteProject = async (req, res) => {
    try {
        // Cascading delete in database ensures images/comments are also removed
        await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
        
        // [SOCKET] Emit event
        const io = req.app.get('io');
        io.emit('project:deleted', { id: req.params.id });

        res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * Add Project Update (Timeline)
 * POST /api/v1/projects/:id/updates
 */
export const addProjectUpdate = async (req, res) => {
    try {
        const { message, date } = req.body;
        const projectId = req.params.id;

        await pool.query(
            'INSERT INTO project_updates (project_id, message, author_name, update_date) VALUES (?, ?, ?, ?)',
            [projectId, message, req.user.name, date]
        );

        res.status(201).json({ success: true, message: 'Timeline update added' });
        
        // [SOCKET] Emit event - treat this as a project update so dashboards refresh
        const io = req.app.get('io');
        io.emit('project:updated', { id: projectId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
}
