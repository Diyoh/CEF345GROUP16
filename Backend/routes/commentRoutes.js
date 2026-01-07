import express from 'express';
import { getComments, createComment, deleteComment } from '../controllers/commentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes for fetching and posting
// Note: Frontend routes like /projects/:id/comments map here
// Ideally: router.get('/projects/:id/comments', ...) and router.post('/projects/:id/comments', ...)
// But to keep it modular, we usually mount this on /api/v1 
// So let's define specific paths here to match index.js mount info

router.get('/projects/:id/comments', getComments);
router.post('/projects/:id/comments', createComment);

// Admin moderation
router.delete('/comments/:commentId', protect, authorize('ADMIN'), deleteComment);

export default router;
