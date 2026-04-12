const { pool }   = require('../config/db');
const { logger } = require('../utils/logger');

const EscalationService = {
  // Find all issues that have breached SLA and escalate them
  async processEscalations(io) {
    try {
      // Mark SLA breached
      const { rows: breached } = await pool.query(
        `UPDATE issues
         SET sla_breached = TRUE
         WHERE sla_deadline < NOW()
         AND sla_breached = FALSE
         AND status NOT IN ('resolved', 'closed', 'rejected')
         RETURNING id, ward_id, category, escalation_level, title`
      );

      if (breached.length === 0) {
        logger.info('Escalation check: no new SLA breaches');
        return;
      }

      logger.warn(`Escalation: ${breached.length} issues breached SLA`);

      for (const issue of breached) {
        // Bump escalation level
        const newLevel = Math.min((issue.escalation_level || 0) + 1, 3);

        await pool.query(
          `UPDATE issues
           SET escalation_level = $1,
               priority_score   = priority_score + 50
           WHERE id = $2`,
          [newLevel, issue.id]
        );

        // Log escalation
        await pool.query(
          `INSERT INTO issue_status_history (issue_id, to_status, note)
           VALUES ($1::uuid, 'submitted'::text, $2::text)`,
          [issue.id, `SLA breached — escalated to level ${newLevel}`]
        );

        // Emit real-time event to ward room
        if (io) {
          io.to(`ward:${issue.ward_id}`).emit('sla_breach', {
            issueId:        issue.id,
            title:          issue.title,
            category:       issue.category,
            escalationLevel: newLevel,
            breachedAt:     new Date().toISOString(),
          });
        }

        logger.warn(`Issue ${issue.id} escalated to level ${newLevel}`);
      }

    } catch (err) {
      logger.error('Escalation processing error:', err.message);
    }
  },
};

module.exports = EscalationService;