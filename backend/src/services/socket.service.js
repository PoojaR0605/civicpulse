const { logger } = require('../utils/logger');
const jwt = require('jsonwebtoken');

let io;

const SocketService = {
  init(server) {
    const { Server } = require('socket.io');
    io = new Server(server, {
      cors: {
        origin: ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    // JWT auth on socket connect
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token ||
                    socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });

    io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id} user: ${socket.user?.id}`);

      // Join ward room — municipal officers join their ward
      socket.on('join_ward', (wardId) => {
        socket.join(`ward:${wardId}`);
        logger.info(`Socket ${socket.id} joined ward:${wardId}`);
      });

      // Join personal room — citizens track their own issues
      socket.on('join_user', (userId) => {
        if (socket.user?.id === userId) {
          socket.join(`user:${userId}`);
          logger.info(`Socket ${socket.id} joined user:${userId}`);
        }
      });

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });

    logger.info('Socket.io initialized');
    return io;
  },

  getIO() {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
  },

  // Emit issue status change to ward + user rooms
  emitStatusChange(issue) {
    if (!io) return;
    const event = {
      issueId:   issue.id,
      status:    issue.status,
      updatedAt: new Date().toISOString(),
    };
    io.to(`ward:${issue.ward_id}`).emit('status_change', event);
    io.to(`user:${issue.reported_by}`).emit('status_change', event);
  },

  // Emit new issue to ward room
  emitNewIssue(issue, ward) {
    if (!io || !ward) return;
    io.to(`ward:${ward.id}`).emit('new_issue', {
      issueId:  issue.id,
      category: issue.category,
      status:   issue.status,
      priority: issue.priority_score,
      ward:     ward.ward_name,
    });
  },
};

module.exports = SocketService;