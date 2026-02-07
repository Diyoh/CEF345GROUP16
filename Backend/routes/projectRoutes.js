/**
 * PROJECT ROUTES
 * 
 * This file handles the URL routing for '/api/v1/projects'.
 * It maps specific HTTP methods and paths to Controller functions.
 * 
 * MIDDLEWARE EXPLAINED:
 * - protect: Verifies that the user is logged in (checks for valid JWT cookie).
 * - authorize('ROLE'): Checks if the logged-in user has the required permission.
 */

import express from 'express';
import { getProjects, getProjectById, createProject, updateProject, deleteProject, addProjectUpdate } from '../controllers/projectController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

/**
 * PUBLIC ROUTES
 * Anyone can view projects.
 */
router.get('/', getProjects);       // GET /api/v1/projects
router.get('/:id', getProjectById); // GET /api/v1/projects/123

/**
 * PROTECTED ROUTES
 * Only authorized users can perform modifying actions.
 */

// 1. Create Project: Only ADMINS can create new projects.
router.post('/', protect, authorize('ADMIN'), upload.array('images', 10), createProject);

// 2. Update Project: Contractors update their progress; Admins can update anything.
// We allow image uploads on updates too
router.patch('/:id', protect, authorize('ADMIN', 'CONTRACTOR'), upload.array('images', 10), updateProject);

// 3. Delete Project: Only ADMINS can delete.
router.delete('/:id', protect, authorize('ADMIN'), deleteProject);

// 4. Add Timeline Update: Both Admins and Contractors can post updates.
router.post('/:id/updates', protect, authorize('ADMIN', 'CONTRACTOR'), addProjectUpdate);

export default router;
