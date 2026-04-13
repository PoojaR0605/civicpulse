const { pool }   = require('../config/db');
const { logger } = require('../utils/logger');

const NotificationService = {
  // Send FCM push notification to a user
  async sendToUser(userId, { title, body, type, issueId }) {
    try {
      // Get user's FCM token
      const { rows } = await pool.query(
        `SELECT fcm_token FROM users WHERE id = $1`,
        [userId]
      );

      const fcmToken = rows[0]?.fcm_token;

      // Save notification to DB regardless of FCM
      await pool.query(
        `INSERT INTO notifications (user_id, issue_id, title, body, type)
         VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::text)`,
        [userId, issueId || null, title, body, type || 'status_update']
      );

      // Send FCM if token exists
      if (fcmToken) {
        await this.sendFCM(fcmToken, { title, body, issueId });
      } else {
        logger.warn(`No FCM token for user ${userId} — notification saved to DB only`);
      }

    } catch (err) {
      logger.error('Notification send failed:', err.message);
    }
  },

  // Send raw FCM message
  async sendFCM(token, { title, body, issueId }) {
    try {
      // Firebase Admin SDK — initialized in app startup
      const admin = require('firebase-admin');

      // Check if Firebase is initialized
      if (!admin.apps.length) {
        logger.warn('Firebase not initialized — skipping FCM');
        return;
      }

      await admin.messaging().send({
        token,
        notification: { title, body },
        data: {
          issueId: issueId || '',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: { sound: 'default' },
        },
        apns: {
          payload: {
            aps: { sound: 'default' },
          },
        },
      });

      logger.info(`FCM sent to token ${token.substring(0, 20)}...`);

    } catch (err) {
      logger.warn('FCM send failed:', err.message);
    }
  },

  // Notify citizen when issue status changes
  async notifyStatusChange(issue, newStatus) {
    const messages = {
      validated:   'Your issue has been verified and is now in our system.',
      assigned:    'Your issue has been assigned to a municipal officer.',
      in_progress: 'Work has started on your reported issue.',
      resolved:    'Your issue has been resolved. Thank you for reporting!',
      rejected:    'Your issue could not be processed. Please resubmit with clearer details.',
    };

    const body = messages[newStatus] || `Your issue status updated to: ${newStatus}`;

    await this.sendToUser(issue.reported_by, {
      title:   `Issue Update — ${issue.category}`,
      body,
      type:    'status_update',
      issueId: issue.id,
    });
  },

  // Notify officer when issue assigned
  async notifyOfficer(officerId, issue) {
    await this.sendToUser(officerId, {
      title:   'New Issue Assigned',
      body:    `You have been assigned a ${issue.category} issue in ${issue.ward_name || 'your ward'}.`,
      type:    'assigned',
      issueId: issue.id,
    });
  },

  // Notify about SLA breach
  async notifySLABreach(issue) {
    await this.sendToUser(issue.reported_by, {
      title:   'Issue SLA Breached',
      body:    `Your ${issue.category} issue has exceeded its resolution deadline and has been escalated.`,
      type:    'sla_breach',
      issueId: issue.id,
    });
  },

  // Get notifications for a user
  async getUserNotifications(userId, limit = 20) {
    const { rows } = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY sent_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return rows;
  },

  // Mark notification as read
  async markRead(notificationId, userId) {
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  },
};

module.exports = NotificationService;