const IssueModel      = require('../models/issue.model');
const UserModel       = require('../models/user.model');
const WardModel       = require('../models/ward.model');
const { pool }        = require('../config/db');
const { logger }      = require('../utils/logger');
const SocketService   = require('./socket.service');
const PriorityService = require('./priority.service');

const uploadPhoto = async (file) => {
  if (!file) return { url: null, path: null };
  return {
    url:  `https://storage.example.com/stub/${Date.now()}.jpg`,
    path: `issues/stub/${Date.now()}.jpg`,
  };
};

const encodeGeohash = (lat, lng, precision = 7) => {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let idx = 0, bit = 0, evenBit = true, geohash = '';
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  while (geohash.length < precision) {
    if (evenBit) {
      const lngMid = (lngMin + lngMax) / 2;
      if (lng >= lngMid) { idx = idx * 2 + 1; lngMin = lngMid; }
      else               { idx = idx * 2;     lngMax = lngMid; }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) { idx = idx * 2 + 1; latMin = latMid; }
      else               { idx = idx * 2;     latMax = latMid; }
    }
    evenBit = !evenBit;
    if (++bit === 5) { geohash += BASE32[idx]; bit = 0; idx = 0; }
  }
  return geohash;
};

const getSlaDeadline = async (category) => {
  const { rows } = await pool.query(
    `SELECT sla_hours, base_priority FROM sla_config WHERE category = $1`, [category]
  );
  if (!rows[0]) return { deadline: null, basePriority: 5 };
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + rows[0].sla_hours);
  return { deadline, basePriority: rows[0].base_priority };
};

const IssuesService = {
  async submit({ reportedBy, latitude, longitude, gpsAccuracy, category, title, description, address, file }) {
    // 1. Route to ward
    const ward = await WardModel.findByCoordinates(latitude, longitude);

    // 2. Upload photo
    const { url: photoUrl, path: photoPath } = await uploadPhoto(file);

    // 3. Geohash for dedup
    const geohash = encodeGeohash(latitude, longitude, 7);

    // 4. GPS-based dedup
    const DedupService = require('./dedup.service');
    const gpsDuplicate = await DedupService.isDuplicate(geohash, category);
    if (gpsDuplicate) {
      logger.info(`GPS duplicate detected — original issue ${gpsDuplicate.issueId}`);
      await DedupService.handleDuplicate(gpsDuplicate.issueId, reportedBy);
      const original = await IssueModel.findById(gpsDuplicate.issueId);
      return { issue: original, ward: ward || null, isDuplicate: true, duplicateType: 'gps' };
    }

    // 5. Text similarity dedup
    const textDuplicateId = await DedupService.isTextDuplicate(title, description, category, ward?.id);
    if (textDuplicateId) {
      logger.info(`Text duplicate detected — original issue ${textDuplicateId}`);
      await DedupService.handleDuplicate(textDuplicateId, reportedBy);
      const original = await IssueModel.findById(textDuplicateId);
      return { issue: original, ward: ward || null, isDuplicate: true, duplicateType: 'text' };
    }

    // 6. SLA
    const { deadline: slaDeadline, basePriority } = await getSlaDeadline(category);

    // 7. Create issue
    const issue = await IssueModel.create({
      reportedBy, latitude, longitude, gpsAccuracy,
      address, wardId: ward?.id || null,
      category, title, description,
      photoUrl, photoPath, geohash,
      slaDeadline, basePriority,
    });

    // 8. Audit trail
    await pool.query(
      `INSERT INTO issue_status_history (issue_id, changed_by, to_status, note)
       VALUES ($1, $2, 'submitted', 'Issue submitted by citizen')`,
      [issue.id, reportedBy]
    );

    // 9. Register dedup
    await DedupService.register(geohash, category, issue.id);

    // 10. Priority score
    await PriorityService.calculateScore(issue.id);

    // 11. Real-time emit
    try { SocketService.emitNewIssue(issue, ward); } catch (_) {}

    // 12. AI validation async
    if (file) {
      const ValidatorService = require('./ai/validator.service');
      setImmediate(() => {
        ValidatorService.validateIssue({
          issueId:     issue.id,
          imageBuffer: file.buffer,
          imageName:   file.originalname,
          category, lat: latitude, lng: longitude,
        }).then(async (result) => {
          // Trust score update based on AI result
          if (result.status === 'validated') {
            await UserModel.updateTrustScore(reportedBy, +5);
          } else if (result.status === 'rejected') {
            await UserModel.updateTrustScore(reportedBy, -10);
          }
        }).catch(err => logger.error('Background AI error:', err.message));
      });
    }

    return { issue, ward: ward || null, isDuplicate: false };
  },

  async getAll(filters) {
    const [issues, total] = await Promise.all([
      IssueModel.findAll(filters),
      IssueModel.countAll(filters),
    ]);
    return { issues, total, page: filters.page || 1 };
  },

  async getById(id) {
    const issue = await IssueModel.findById(id);
    if (!issue) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }
    return issue;
  },

  async updateStatus(id, status, changedBy, note) {
    const issue = await IssueModel.findById(id);
    if (!issue) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }
    const updated = await IssueModel.updateStatus(id, status, changedBy, note);
    try { SocketService.emitStatusChange(updated); } catch (_) {}
    try {
      const NotificationService = require('./notification.service');
      await NotificationService.notifyStatusChange(updated, status);
    } catch (_) {}
    return updated;
  },

  async vote(issueId, userId) {
    const { rows } = await pool.query(
      `SELECT id FROM votes WHERE issue_id = $1 AND user_id = $2`, [issueId, userId]
    );
    if (rows.length > 0) { const err = new Error('Already voted'); err.statusCode = 409; throw err; }
    await pool.query(`INSERT INTO votes (issue_id, user_id) VALUES ($1, $2)`, [issueId, userId]);
    const result = await IssueModel.incrementVote(issueId);
    await PriorityService.calculateScore(issueId);
    return result;
  },

  async getMyIssues(userId, filters) {
    return IssueModel.findByReporter(userId, filters);
  },

  // Analytics for officer dashboard
  async getAnalytics() {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                                      AS total,
        COUNT(*) FILTER (WHERE status='resolved')                     AS resolved,
        COUNT(*) FILTER (WHERE status IN ('in_progress','assigned'))  AS in_progress,
        COUNT(*) FILTER (WHERE status='submitted')                    AS pending,
        COUNT(*) FILTER (WHERE sla_breached=TRUE)                     AS overdue,
        COUNT(*) FILTER (WHERE status='rejected')                     AS rejected,
        COUNT(*) FILTER (WHERE is_duplicate=TRUE)                     AS duplicates_merged,
        ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)
          FILTER (WHERE resolved_at IS NOT NULL)::numeric, 1)         AS avg_resolution_hours
      FROM issues
    `);

    const { rows: byCategory } = await pool.query(`
      SELECT category, COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='resolved') AS resolved,
        COUNT(*) FILTER (WHERE sla_breached=TRUE) AS overdue
      FROM issues WHERE is_duplicate = FALSE
      GROUP BY category ORDER BY total DESC
    `);

    const { rows: byWard } = await pool.query(`
      SELECT w.ward_name, w.ward_number,
        COUNT(i.id) AS total,
        COUNT(i.id) FILTER (WHERE i.status='resolved') AS resolved,
        COUNT(i.id) FILTER (WHERE i.sla_breached=TRUE) AS overdue,
        ROUND(AVG(i.priority_score)::numeric, 1) AS avg_priority
      FROM issues i
      LEFT JOIN wards w ON w.id = i.ward_id
      WHERE i.is_duplicate = FALSE
      GROUP BY w.ward_name, w.ward_number
      ORDER BY total DESC
    `);

    return { summary: rows[0], byCategory, byWard };
  },
};

module.exports = IssuesService;