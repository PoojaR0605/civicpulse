const express = require('express');
const router = express.Router();

const { pool } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/wards/analytics
router.get(
  '/analytics',
  authenticate,
  authorize('officer', 'admin'),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(`
        SELECT
          COUNT(*)                                            AS total,
          COUNT(*) FILTER (WHERE status='resolved')          AS resolved,
          COUNT(*) FILTER (WHERE status='in_progress')       AS in_progress,
          COUNT(*) FILTER (WHERE status='submitted')         AS pending,
          COUNT(*) FILTER (WHERE sla_breached=TRUE)          AS overdue,
          COUNT(*) FILTER (WHERE status='rejected')          AS rejected,
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)
            FILTER (WHERE resolved_at IS NOT NULL)           AS avg_resolution_hours,
          category,
          w.ward_name
        FROM issues i
        LEFT JOIN wards w ON w.id = i.ward_id
        WHERE i.is_duplicate = FALSE
        GROUP BY category, w.ward_name
        ORDER BY total DESC
      `);

      res.status(200).json({
        success: true,
        count: rows.length,
        data: rows,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;