import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { getIndex, getProjects, getProjectsCsv, getStats } from '../controllers/publicController.js';

const router = express.Router();

/**
 * PUBLIC OPEN-DATA ROUTES
 *
 * These deliberately do NOT use the application's CORS allowlist.
 *
 * The allowlist exists because the app API carries an auth cookie: reflecting any origin
 * there would let any website act as a logged-in admin. None of that applies here. These
 * routes are read-only, carry no credentials, and expose data that is already public on the
 * website — so restricting them by origin would achieve nothing except preventing the exact
 * use we want, a journalist or NGO building something on top of this.
 *
 * `credentials: false` is the load-bearing part: with it, a browser will not attach cookies,
 * so these routes cannot be turned into an authenticated request no matter who calls them.
 */
const openCors = cors({
    origin: '*',
    credentials: false,
    methods: ['GET', 'OPTIONS'],
});

/**
 * A separate, more generous limit than the app's. Bulk export is the point of this API, so
 * the app's per-page budget would be wrong — but it is still bounded, because an unmetered
 * open endpoint is a free denial-of-service tool.
 */
const openLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.PUBLIC_API_RATE_LIMIT) || 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Rate limit reached. This is an open dataset — if you need bulk or frequent access, use /projects.csv rather than paging.',
    },
});

router.use(openCors);
router.use(openLimiter);

router.get('/', getIndex);
router.get('/projects', getProjects);
router.get('/projects.csv', getProjectsCsv);
router.get('/stats', getStats);

export default router;
