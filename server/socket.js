'use strict';

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const User = require('./models/User');
const messageService = require('./services/message.service');
const logger = require('./config/logger');

const COOKIE_NAME = 'tt_session';
let io;

async function authenticateSocket(socket, next) {
  try {
    const rawCookie = socket.handshake.headers.cookie;
    if (!rawCookie) return next(new Error('Authentication error: no cookie'));

    const parsed = cookie.parse(rawCookie);
    const token = parsed[COOKIE_NAME];
    if (!token) return next(new Error('Authentication error: no session token'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.sub) return next(new Error('Authentication error: malformed token'));

    const user = await User.findById(decoded.sub).select('name role');
    if (!user) return next(new Error('Authentication error: user not found'));

    socket.user = { id: user._id.toString(), name: user.name, role: user.role };
    return next();
  } catch (err) {
    return next(new Error('Authentication error: ' + err.message));
  }
}

module.exports = {
  init: (httpServer) => {
    io = socketIo(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    io.use(authenticateSocket);

    io.on('connection', (socket) => {
      logger.info(`[Socket] Connected: ${socket.user.id}`);

      socket.on('join_room', async (projectId) => {
        try {
          const conv = await messageService.getOrCreateConversation(projectId);
          if (!conv.isMember(socket.user.id)) {
            return socket.emit('error', { message: 'Access denied to this project chat.' });
          }
          socket.join(`project-${projectId}`);
        } catch (err) {
          socket.emit('error', { message: err.message });
        }
      });

      socket.on('leave_room', (projectId) => {
        socket.leave(`project-${projectId}`);
      });

      socket.on('send-message', async (payload) => {
        try {
          const { projectId, text, fileUrl } = payload;
          const conv = await messageService.getOrCreateConversation(projectId);
          if (!conv.isMember(socket.user.id)) {
            return socket.emit('error', { message: 'Access denied.' });
          }
          const message = await messageService.createMessage({
            conversationId: conv._id,
            senderId: socket.user.id,
            text,
            fileUrl,
          });
          io.to(`project-${projectId}`).emit('new-message', message);
        } catch (err) {
          socket.emit('error', { message: err.message });
        }
      });

      socket.on('typing-start', ({ projectId }) => {
        socket.to(`project-${projectId}`).emit('typing-start', { userId: socket.user.id, projectId });
      });

      socket.on('typing-stop', ({ projectId }) => {
        socket.to(`project-${projectId}`).emit('typing-stop', { userId: socket.user.id, projectId });
      });

      socket.on('mark-read', async ({ projectId, lastMessageId }) => {
        try {
          const conv = await messageService.getOrCreateConversation(projectId);
          await messageService.markMessagesRead(conv._id, socket.user.id, lastMessageId);
          socket.to(`project-${projectId}`).emit('messages-read', { projectId, userId: socket.user.id });
        } catch (err) {
          socket.emit('error', { message: err.message });
        }
      });

      socket.on('disconnect', () => {
        logger.info(`[Socket] Disconnected: ${socket.user?.id}`);
      });
    });

    return io;
  },
  getIo: () => {
    if (!io) throw new Error('Socket.io not initialized!');
    return io;
  },
};