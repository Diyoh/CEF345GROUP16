import { Server } from 'socket.io';

export const startSocketServer = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            // [DEV] ALlow multiple local ports in case 5173 is busy
            origin: [
                "http://localhost:5173", 
                "http://localhost:5174",
                "http://localhost:5175",
                "http://localhost:3000"
            ],
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
