const { pool } = require('../config/db');
const { logger } = require('../utils/logger');

const PriorityService = {
  /**
   * Calculate priority score for an issue
   * Formula: base_priority * 10 + votes * 2 + age_hours * 0.1 + ward_risk * 20
   */
  async calculateScore(issueId) {
    const { rows } = await pool.query(
      `SELECT
         i.base_priority,
         i.vote_count,
         i.created_at,
         i.sla_deadline,
         i.sla_breached,
         w.risk_score
       FROM issues i
       LEFT JOIN wards w ON w.id = i.ward_id
       WHERE i.id = $1`,
      [issueId]
    );

    if (!rows[0]) return 0;

    const issue = rows[0];
    const ageHours = (Date.now() - new Date(issue.created_at)) / (1000 * 60 * 60);
    const wardRisk = parseFloat(issue.risk_score || 0.5);

    let score = 0;
    score += (issue.base_priority || 5) * 10;
    score += (issue.vote_count || 0) * 2;
    score += Math.min(ageHours * 0.1, 10); // cap age contribution at 10
    score += wardRisk * 20;

    // SLA breach bonus — breached issues jump to top
    if (issue.sla_breached) score += 50;

    const finalScore = Math.round(score * 100) / 100;

    await pool.query(
      `UPDATE issues SET priority_score = $1 WHERE id = $2`,
      [finalScore, issueId]
    );

    return finalScore;
  },

  // Recalculate scores for all open issues in a ward
  async recalculateWard(wardId) {
    const { rows } = await pool.query(
      `SELECT id FROM issues
       WHERE ward_id = $1
       AND status NOT IN ('resolved', 'closed', 'rejected')`,
      [wardId]
    );

    for (const row of rows) {
      await this.calculateScore(row.id);
    }

    logger.info(`Recalculated priority for ${rows.length} issues in ward ${wardId}`);
  },
};

module.exports = PriorityService;