const { pool }  = require('../config/db');
const { logger } = require('../utils/logger');

let redisClient = null;
try { redisClient = require('../config/redis'); } catch (_) {}

// TF-IDF cosine similarity for text dedup
function tokenize(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
}

function cosineSimilarity(textA, textB) {
  const tokensA  = tokenize(textA);
  const tokensB  = tokenize(textB);
  if (!tokensA.length || !tokensB.length) return 0;
  const allTokens = [...new Set([...tokensA, ...tokensB])];
  const freqA = {}, freqB = {};
  allTokens.forEach(t => { freqA[t] = 0; freqB[t] = 0; });
  tokensA.forEach(t => freqA[t]++);
  tokensB.forEach(t => freqB[t]++);
  let dot = 0, magA = 0, magB = 0;
  allTokens.forEach(t => {
    dot  += freqA[t] * freqB[t];
    magA += freqA[t] ** 2;
    magB += freqB[t] ** 2;
  });
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

const DedupService = {
  // GPS-based dedup using geohash + Redis
  async isDuplicate(geohash, category) {
    if (!redisClient) return null;
    try {
      const key = `dedup:${category}:${geohash}`;
      const val = await redisClient.get(key);
      return val ? JSON.parse(val) : null;
    } catch (_) { return null; }
  },

  async register(geohash, category, issueId) {
    if (!redisClient) return;
    try {
      const key = `dedup:${category}:${geohash}`;
      await redisClient.setEx(key, 72 * 3600, JSON.stringify({ issueId }));
    } catch (_) {}
  },

  async handleDuplicate(originalIssueId, reportedBy) {
    try {
      await pool.query(
        `UPDATE issues SET vote_count = vote_count + 1, priority_score = priority_score + 2 WHERE id = $1`,
        [originalIssueId]
      );
    } catch (_) {}
  },

  // Text similarity dedup — TF-IDF cosine
  async isTextDuplicate(title, description, category, wardId) {
    try {
      const conditions = [`category = $1`, `is_duplicate = FALSE`, `created_at > NOW() - INTERVAL '7 days'`];
      const params = [category];
      if (wardId) { conditions.push(`ward_id = $2`); params.push(wardId); }

      const { rows } = await pool.query(
        `SELECT id, title, description FROM issues WHERE ${conditions.join(' AND ')} LIMIT 100`,
        params
      );

      for (const issue of rows) {
        const titleSim = cosineSimilarity(title || '', issue.title || '');
        const descSim  = cosineSimilarity(description || '', issue.description || '');
        const combined = (titleSim * 0.6) + (descSim * 0.4);
        if (combined > 0.70) {
          logger.info(`Text duplicate detected: similarity=${combined.toFixed(2)} with issue ${issue.id}`);
          return issue.id;
        }
      }
      return null;
    } catch (err) {
      logger.warn('Text dedup failed:', err.message);
      return null;
    }
  },
};

module.exports = DedupService;