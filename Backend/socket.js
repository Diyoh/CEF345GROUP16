import { Server } from 'socket.io';
import { allowedOrigins } from './config/allowedOrigins.js';

/**
 * SOCKET SERVER
 *
 * Real-time project updates. Shares the SAME origin allowlist as the REST API
 * (config/allowedOrigins.js) — previously this list was hardcoded to localhost,
 * so live updates silently stopped working once the app was deployed.
 */
export const startSocketServer = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
};
