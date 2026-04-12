require('dotenv').config();
const http              = require('http');
const app               = require('./app');
const { connectDB }     = require('./config/db');
const { connectRedis }  = require('./config/redis');
const { logger }        = require('./utils/logger');
const SocketService     = require('./services/socket.service');
const { startEscalationJob } = require('./jobs/escalation.job');

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDB();
    await connectRedis();

    const server = http.createServer(app);

    // Initialize Socket.io
    const io = SocketService.init(server);
    app.set('io', io);

    // Start escalation cron
    startEscalationJob(io);

    server.listen(PORT, () => {
      logger.info(`Server running → http://localhost:${PORT}`);
      logger.info(`Health check  → http://localhost:${PORT}/api/v1/health`);
    });

    process.on('SIGTERM', () => server.close(() => process.exit(0)));

  } catch (err) {
    logger.error('Startup failed:', err);
    process.exit(1);
  }
};

start();