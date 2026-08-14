/**
 * ALLOWED ORIGINS
 *
 * A single source of truth for which websites may talk to this API.
 * Used by BOTH the Express CORS middleware and the Socket.io server, so the two
 * can never drift apart (they previously did: Express allowed everything while
 * Socket.io only allowed localhost, which is why real-time died in production).
 *
 * WHY THIS MATTERS MORE THAN USUAL HERE:
 * Auth is a cookie, and CORS is configured with credentials:true. Reflecting any
 * origin back would let ANY website make authenticated requests on behalf of a
 * logged-in admin — the browser would attach the cookie automatically. An allowlist
 * is what stops that.
 *
 * CONFIGURE: set CORS_ORIGINS in .env as a comma-separated list, e.g.
 *   CORS_ORIGINS=https://buildright.vercel.app,https://www.buildright.cm
 */

import dotenv from 'dotenv';

// ES module imports are evaluated BEFORE the importing file's own body runs, so we
// cannot rely on index.js having called dotenv.config() yet. Load it here, exactly
// as config/db.js does.
dotenv.config();

const DEVELOPMENT_ORIGINS = [
    'http://localhost:5173', // Vite default
    'http://localhost:5174', // Vite fallback when 5173 is busy
    'http://localhost:5175',
    'http://localhost:3000',
    'http://localhost:8080'  // Docker Compose frontend
];

const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';

/** The full list of origins permitted to send credentialed requests. */
export const allowedOrigins = isProduction
    ? configuredOrigins
    : [...new Set([...DEVELOPMENT_ORIGINS, ...configuredOrigins])];

if (isProduction && allowedOrigins.length === 0) {
    console.warn(
        '[CORS] NODE_ENV=production but CORS_ORIGINS is empty — all browser requests will be rejected. ' +
        'Set CORS_ORIGINS to your frontend URL.'
    );
}

/**
 * isOriginAllowed
 * Requests with no Origin header (curl, health checks, server-to-server) are
 * permitted: the header is only absent when there is no browser to protect.
 */
export const isOriginAllowed = (origin) => !origin || allowedOrigins.includes(origin);

/** Ready-made options object for the `cors` middleware. */
export const corsOptions = {
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) return callback(null, true);
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true, // Required for the auth cookie to be sent and set
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
};
