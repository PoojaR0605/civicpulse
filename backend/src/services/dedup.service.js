const { getRedis } = require('../config/redis');
const { logger }   = require('../utils/logger');

const DEDUP_TTL = 72 * 60 * 60; // 72 hours

const DedupService = {
  async isDuplicate(geohash, category) {
    try {
      const redis = getRedis();
      const key   = `dedup:${geohash}:${category}`;
      const existing = await redis.get(key);
      return existing ? JSON.parse(existing) : null;
    } catch (err) {
      logger.warn('Redis dedup check failed:', err.message);
      return null;
    }
  },

  async register(geohash, category, issueId) {
    try {
      const redis = getRedis();
      const key   = `dedup:${geohash}:${category}`;
      await redis.setEx(
        key,
        DEDUP_TTL,
        JSON.stringify({ issueId, registeredAt: new Date().toISOString() })
      );
      logger.info(`Dedup registered: ${key}`);
    } catch (err) {
      logger.warn('Redis dedup register failed:', err.message);
    }
  },

  async handleDuplicate(originalIssueId, reportedBy) {
    const { pool } = require('../config/db');
    try {
      await pool.query(
        `INSERT INTO votes (issue_id, user_id) VALUES ($1, $2)
         ON CONFLICT (issue_id, user_id) DO NOTHING`,
        [originalIssueId, reportedBy]
      );
      await pool.query(
        `UPDATE issues
         SET vote_count     = vote_count + 1,
             priority_score = priority_score + 1
         WHERE id = $1`,
        [originalIssueId]
      );
    } catch (err) {
      logger.warn('Duplicate vote failed:', err.message);
    }
    return { isDuplicate: true, originalIssueId };
  },
};

module.exports = DedupService;