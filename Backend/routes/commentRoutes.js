import express from 'express';
import rateLimit from 'express-rate-limit';
import { getComments, createComment, deleteComment } from '../controllers/commentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes for fetching and posting
// Note: Frontend routes like /projects/:id/comments map here
// Ideally: router.get('/projects/:id/comments', ...) and router.post('/projects/:id/comments', ...)
// But to keep it modular, we usually mount this on /api/v1 
// So let's define specific paths here to match index.js mount info

router.get('/projects/:id/comments', getComments);
// Citizen reports are deliberately unauthenticated: that openness is the
// check on contractor self-reporting. It is also the platform's only
// unauthenticated write, so it carries its own limiter: ten reports per
// fifteen minutes per IP is generous for a citizen and useless for a spammer.
const reportLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Too many reports from this connection. Try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/projects/:id/comments', reportLimiter, createComment);

// Admin moderation
router.delete('/comments/:commentId', protect, authorize('PLATFORM_ADMIN'), deleteComment);

export default router;
