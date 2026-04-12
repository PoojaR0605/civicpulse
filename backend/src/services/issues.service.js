const IssueModel      = require('../models/issue.model');
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
    if (++bit === 5) {
      geohash += BASE32[idx];
      bit = 0; idx = 0;
    }
  }
  return geohash;
};

const getSlaDeadline = async (category) => {
  const { rows } = await pool.query(
    `SELECT sla_hours, base_priority FROM sla_config WHERE category = $1`,
    [category]
  );
  if (!rows[0]) return { deadline: null, basePriority: 5 };
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + rows[0].sla_hours);
  return { deadline, basePriority: rows[0].base_priority };
};

const IssuesService = {
  async submit({ reportedBy, latitude, longitude, gpsAccuracy,
                 category, title, description, address, file }) {
    const ward = await WardModel.findByCoordinates(latitude, longitude);
    const { url: photoUrl, path: photoPath } = await uploadPhoto(file);
    const geohash = encodeGeohash(latitude, longitude, 7);

    const DedupService = require('./dedup.service');
    const duplicate = await DedupService.isDuplicate(geohash, category);
    if (duplicate) {
      logger.info(`Duplicate detected — original issue ${duplicate.issueId}`);
      await DedupService.handleDuplicate(duplicate.issueId, reportedBy);
      const original = await IssueModel.findById(duplicate.issueId);
      return { issue: original, ward: ward || null, isDuplicate: true };
    }

    const { deadline: slaDeadline, basePriority } = await getSlaDeadline(category);

    const issue = await IssueModel.create({
      reportedBy, latitude, longitude, gpsAccuracy,
      address, wardId: ward?.id || null,
      category, title, description,
      photoUrl, photoPath, geohash,
      slaDeadline, basePriority,
    });

    await pool.query(
      `INSERT INTO issue_status_history (issue_id, changed_by, to_status, note)
       VALUES ($1, $2, 'submitted', 'Issue submitted by citizen')`,
      [issue.id, reportedBy]
    );

    await DedupService.register(geohash, category, issue.id);

    // Calculate initial priority score
    await PriorityService.calculateScore(issue.id);

    // Emit new issue to ward room
    try { SocketService.emitNewIssue(issue, ward); } catch (_) {}

    // Async AI validation
    if (file) {
      const ValidatorService = require('./ai/validator.service');
      setImmediate(() => {
        ValidatorService.validateIssue({
          issueId:     issue.id,
          imageBuffer: file.buffer,
          imageName:   file.originalname,
          category,
          lat:         latitude,
          lng:         longitude,
        }).catch(err => logger.error('Background AI validation error:', err.message));
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
    if (!issue) {
      const err = new Error('Issue not found');
      err.statusCode = 404;
      throw err;
    }
    return issue;
  },

  async updateStatus(id, status, changedBy, note) {
    const issue = await IssueModel.findById(id);
    if (!issue) {
      const err = new Error('Issue not found');
      err.statusCode = 404;
      throw err;
    }
    const updated = await IssueModel.updateStatus(id, status, changedBy, note);

    // Emit real-time status change
    try { SocketService.emitStatusChange(updated); } catch (_) {}

    return updated;
  },

  async vote(issueId, userId) {
    const { rows } = await pool.query(
      `SELECT id FROM votes WHERE issue_id = $1 AND user_id = $2`,
      [issueId, userId]
    );
    if (rows.length > 0) {
      const err = new Error('Already voted on this issue');
      err.statusCode = 409;
      throw err;
    }
    await pool.query(
      `INSERT INTO votes (issue_id, user_id) VALUES ($1, $2)`,
      [issueId, userId]
    );
    const result = await IssueModel.incrementVote(issueId);

    // Recalculate priority after vote
    await PriorityService.calculateScore(issueId);

    return result;
  },

  async getMyIssues(userId, filters) {
    return IssueModel.findByReporter(userId, filters);
  },
};

module.exports = IssuesService;