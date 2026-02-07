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

// Route Imports
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import statsRoutes from './routes/statsRoutes.js';

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
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, 
	max: 1000, // [DEV] Increased from 100 to 1000 to prevent locking out during testing
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
	legacyHeaders: false,
});
app.use(limiter);

// [SECURITY FIX] Restrict CORS to our Frontend Only
// credentials: true is REQUIRED for Cookies to work
app.use(cors({
    origin: true,                    // [DEV] Allow ANY origin dynamically (reflects request origin)
    credentials: true,               // Allow Cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// [SECURITY FIX] Cookie Parser
app.use(cookieParser());

// Enable JSON parsing. 
// We kept the limit high for Base64 images as per project structure, but Rate Limiting helps mitigate DoS.
app.use(express.json({ limit: '50mb' }));

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
});
