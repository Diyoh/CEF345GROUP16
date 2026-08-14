/**
 * BACKEND ENTRY POINT
 * This file sets up the Express server, configures middleware, defines routes,
 * and starts the application listening on a specific port.
 */

import express from 'express';  // The main web framework for Node.js
import cors from 'cors';        // Middleware to enable Cross-Origin Resource Sharing
import dotenv from 'dotenv';    // Loads environment variables
import path from 'path';        // Built-in Node.js module for handling file paths
import { fileURLToPath } from 'url'; // Helpers to handle file paths in ES Modules
import cookieParser from 'cookie-parser'; // [NEW] Parses cookies attached to the client request object
import rateLimit from 'express-rate-limit'; // [NEW] Basic rate-limiting middleware
import helmet from 'helmet'; // [NEW] Secures apps by setting various HTTP headers
import { corsOptions, allowedOrigins } from './config/allowedOrigins.js'; // Shared CORS allowlist
import { serializeResponse } from './utils/serialize.js'; // snake_case -> camelCase on the way out

// Route Imports
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import publicRoutes from './routes/publicRoutes.js';

// Load environment variables
dotenv.config();

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 5000;

// --- SECURITY MIDDLEWARE SETUP ---

// [SECURITY FIX] Trust Proxy
// Required for secure cookies to work behind Render's Load Balancer
app.set('trust proxy', 1);

// [SECURITY FIX] Helmet sets various HTTP headers to secure the app (XSS protection, etc.)
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images to be loaded by frontend
}));

// [SECURITY FIX] Rate Limiting: Prevent Brute Force & DoS
// Limits a single IP to 100 requests per 15 minutes
// Sized for real browsing rather than for a demo: a citizen loading the portal and paging
// through projects makes a handful of requests, so 300 per 15 minutes leaves generous
// headroom while still bounding scraping and abuse. Configurable so it can be tuned on
// Render without a code change. Credential routes are limited far more tightly in
// routes/authRoutes.js — that is where guessing actually wins something.
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 300,
    message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// [SECURITY FIX] Restrict CORS to a known allowlist.
// This MUST be an allowlist rather than `origin: true`: because auth is a cookie and
// credentials are enabled, reflecting any origin would let any website issue
// authenticated requests as a logged-in user. Configure via CORS_ORIGINS in .env.
app.use(cors(corsOptions));

// [SECURITY FIX] Cookie Parser
app.use(cookieParser());

// JSON body limit.
//
// 50mb was set so Base64 images could be posted inline. That path still exists for citizen
// report photos (capped at 4 by the UI) and the legacy project-image fallback, but 50mb let
// a single UNAUTHENTICATED comment POST push 50 megabytes through Render on every request.
// 10mb comfortably covers four phone photos after Base64's ~33% overhead; genuine bulk
// uploads go through multer as multipart, which this limit does not apply to.
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '10mb' }));

// [OPEN DATA] Mounted BEFORE the camelCase serializer, deliberately.
//
// The public API publishes snake_case field names (budget_xaf, start_date) because they are
// the same names used as CSV column headers, and a published contract must not have its JSON
// and its CSV disagree. The serializer below would rewrite them to budgetXaf/startDate while
// leaving the CSV untouched, silently breaking every consumer's script.
//
// Its own CORS and rate limit live in routes/publicRoutes.js.
app.use('/api/v1/public', publicRoutes);

// [CONTRACT] Everything leaving the APPLICATION API uses camelCase keys.
// MySQL columns are snake_case; the frontend reads camelCase. Converting once here means
// no endpoint — present or future — can reintroduce the mismatch. See utils/serialize.js.
app.use(serializeResponse);

// --- STATIC FILE SERVING ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// --- ROUTE DEFINITIONS ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1', commentRoutes);
app.use('/api/v1/team', teamRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/stats', statsRoutes);

// Root Endpoint
app.get('/', (req, res) => {
    res.send({ message: 'BuildRight API is running', version: '1.0.0' });
});

// --- ERROR HANDLING ---
app.use((err, req, res, next) => {
    // A blocked cross-origin request is a rejected caller, not a server fault.
    if (err.message && err.message.includes('not allowed by CORS')) {
        return res.status(403).json({ success: false, error: 'Origin not allowed' });
    }

    // Multer rejects oversized or non-image uploads — that is the client's mistake.
    if (err.name === 'MulterError' || err.message === 'Only image files are allowed!') {
        return res.status(400).json({ success: false, error: err.message });
    }

    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// --- SERVER START ---
import { startSocketServer } from './socket.js'; // [NEW] Import socket init function
import http from 'http';

const server = http.createServer(app);
const io = startSocketServer(server); // Initialize Socket.io

// Make io accessible to our routes
app.set('io', io);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Accepting browser requests from: ${allowedOrigins.join(', ') || '(none configured)'}`);
});
