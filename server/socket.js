/**
 * server/utils/socket.js
 * Real-time communication bridge for Task Tide.
 * * Strategy:
 * • Implements a Singleton pattern to manage the Socket.io instance.
 * • Centralizes connection events and security middleware.
 */

'use strict';

const socketIo = require('socket.io');

let io;

module.exports = {
  init: (httpServer) => {
    io = socketIo(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    
    // Auth Middleware for Sockets
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      // Verify JWT here
      next();
    });

    io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      socket.on('join_chat', (chatId) => {
        socket.join(chatId);
      });

      socket.on('disconnect', () => {
        console.log('User disconnected');
      });
    });

    return io;
  },
  getIo: () => {
    if (!io) throw new Error('Socket.io not initialized!');
    return io;
  }
};