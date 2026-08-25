/**
 * PROJECT ROUTES
 * 
 * This file handles the URL routing for '/api/v1/projects'.
 * It maps specific HTTP methods and paths to Controller functions.
 * 
 * MIDDLEWARE EXPLAINED:
 * - protect: Verifies that the user is logged in (checks for valid JWT cookie).
 * - authorize('ROLE'): Checks if the logged-in user has the required ROLE.
 *
 * NOTE: authorize() is a coarse gate — it answers "may this KIND of user call this
 * endpoint at all". It cannot answer "may this SPECIFIC user touch this SPECIFIC
 * project", because routes have no access to the record. That ownership rule lives
 * in services/projectService.js (assertCanEditProject).
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
router.post('/', protect, authorize('PLATFORM_ADMIN', 'ENTITY_ADMIN'), upload.array('images', 10), createProject);

// 2. Update Project: Admins can update any project; Contractors ONLY their own
//    (assignment is verified inside the service).
router.patch('/:id', protect, authorize('PLATFORM_ADMIN', 'ENTITY_ADMIN', 'CONTRACTOR'), upload.array('images', 10), updateProject);

// 3. Delete Project: Only ADMINS can delete.
router.delete('/:id', protect, authorize('PLATFORM_ADMIN', 'ENTITY_ADMIN'), deleteProject);

// 4. Add Timeline Update: Both Admins and Contractors can post updates.
router.post('/:id/updates', protect, authorize('PLATFORM_ADMIN', 'ENTITY_ADMIN', 'CONTRACTOR'), addProjectUpdate);

export default router;
