const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.message, err.stack);

  if (err.name === 'JsonWebTokenError')
    return res.status(401).json({ success: false, message: 'Invalid token' });

  if (err.name === 'TokenExpiredError')
    return res.status(401).json({ success: false, message: 'Token expired' });

  if (err.code === '23505')
    return res.status(409).json({ success: false, message: 'Already exists' });

  const status = err.statusCode || err.status || 500;
  return res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

module.exports = { errorHandler, notFound };