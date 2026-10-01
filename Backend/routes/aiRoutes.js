import express from 'express';
import rateLimit from 'express-rate-limit';
import { getStatus, search } from '../controllers/aiController.js';

const router = express.Router();

// Each search runs a model: cheap on a laptop, not free on a paid API, and
// slow either way. Bounded per IP; configurable without a code change.
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.AI_RATE_LIMIT) || 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many AI searches from this address. Try again in a few minutes, or use the filters.' },
});

router.get('/status', getStatus);
router.post('/search', aiLimiter, search);

export default router;
