const express  = require('express');
const router   = express.Router();
const { authenticate } = require('../middleware/auth');
const NotificationService = require('../services/notification.service');

// Get my notifications
router.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await NotificationService.getUserNotifications(
      req.user.id,
      parseInt(req.query.limit) || 20
    );
    res.json({ success: true, data: notifications });
  } catch (err) { next(err); }
});

// Mark as read
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    await NotificationService.markRead(req.params.id, req.user.id);
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) { next(err); }
});

// Update FCM token
router.post('/fcm-token', authenticate, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });
    const { pool } = require('../config/db');
    await pool.query(
      `UPDATE users SET fcm_token = $1 WHERE id = $2`,
      [token, req.user.id]
    );
    res.json({ success: true, message: 'FCM token updated' });
  } catch (err) { next(err); }
});

module.exports = router;