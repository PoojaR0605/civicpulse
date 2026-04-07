const express = require('express');
const router = express.Router();

router.use('/auth',   require('./auth.routes'));
router.use('/issues', require('./issues.routes'));
router.use('/wards',  require('./wards.routes'));

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CivicPulse API is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

module.exports = router;