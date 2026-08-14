import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getMe, logout, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Credential endpoints get their own, much tighter limit.
 *
 * The global limiter in index.js allows 1000 requests per 15 minutes, which is generous
 * enough to brute-force an access code or spray passwords. These two routes are the only
 * places where guessing wins something, so they are throttled separately.
 *
 * skipSuccessfulRequests: a legitimate user who signs in correctly does not burn quota;
 * only failures count, so the limit targets guessing rather than usage.
 */
const credentialLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many attempts. Please try again in 15 minutes.' }
});

router.post('/register', credentialLimiter, register);
router.post('/login', credentialLimiter, login);
router.post('/logout', logout);
router.put('/change-password', protect, changePassword);
router.get('/me', protect, getMe);

export default router;
