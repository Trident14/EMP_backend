import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

import authRoutes from "./routes/auth.js";  
import eventRoutes from "./routes/event.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Create HTTP Server
const server = http.createServer(app);

// ✅ Initialize WebSocket Server
const io = new Server(server, {
    cors: {
        origin: "*",  
        methods: ["GET", "POST"]
    }
});

app.use((req, res, next) => {
    req.io = io;
    return next();
  });

// ✅ Database Connection
mongoose.connect(process.env.DBKEY)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ Middleware
app.use(
    cors({
      origin: "*", // ✅ Allows requests from any domain
      methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
      allowedHeaders: ["Content-Type", "Authorization"], // Allow necessary headers
    })
  );
  
app.use(express.json());

// ✅ Protected Route
app.get('/', (req, res) => {
    io.emit("serverMessage", { message: "Hey yaaa from server" });
    res.status(200).json({ message: "Hello from server" });
    
});

// ✅ API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);


// ✅ WebSocket Events
io.on('connection', (socket) => {
    console.log(`🔗 Client connected: ${socket.id}`);

    // ✅ Join event room
    socket.on("joinEvent", (eventId) => {
        socket.join(eventId);
        console.log(`🔹 Client ${socket.id} joined event room: ${eventId}`);
    });

    // ✅ Leave event room
    socket.on("leaveEvent", (eventId) => {
        socket.leave(eventId);
        console.log(`🔸 Client ${socket.id} left event room: ${eventId}`);
    });

    // ✅ Receive & broadcast messages
    socket.on("message", ({ eventId, message }) => {
        console.log(`📩 Message for event ${eventId}: ${message}`);
        io.to(eventId).emit("message", { sender: socket.id, message });
    });

    // ✅ Handle disconnect
    socket.on("disconnect", () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});


// ✅ Start Server
server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
