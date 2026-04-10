const IssuesService = require('../services/issues.service');

const IssuesController = {
  async submit(req, res, next) {
    try {
      const result = await IssuesService.submit({
        reportedBy:  req.user.id,
        latitude:    parseFloat(req.body.latitude),
        longitude:   parseFloat(req.body.longitude),
        gpsAccuracy: req.body.gpsAccuracy ? parseFloat(req.body.gpsAccuracy) : null,
        category:    req.body.category,
        title:       req.body.title,
        description: req.body.description,
        address:     req.body.address,
        file:        req.file || null,
      });
      res.status(201).json({
        success: true,
        message: 'Issue submitted successfully',
        data: result,
      });
    } catch (err) { next(err); }
  },

  async getAll(req, res, next) {
    try {
      const { wardId, category, status, page = 1, limit = 20 } = req.query;
      const result = await IssuesService.getAll({
        wardId, category, status,
        page: parseInt(page),
        limit: parseInt(limit),
      });
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const issue = await IssuesService.getById(req.params.id);
      res.json({ success: true, data: issue });
    } catch (err) { next(err); }
  },

  async updateStatus(req, res, next) {
    try {
      const issue = await IssuesService.updateStatus(
        req.params.id, req.body.status, req.user.id, req.body.note
      );
      res.json({ success: true, message: 'Status updated', data: issue });
    } catch (err) { next(err); }
  },

  async vote(req, res, next) {
    try {
      const result = await IssuesService.vote(req.params.id, req.user.id);
      res.json({ success: true, message: 'Vote recorded', data: result });
    } catch (err) { next(err); }
  },

  async getMyIssues(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const issues = await IssuesService.getMyIssues(req.user.id, {
        page: parseInt(page), limit: parseInt(limit),
      });
      res.json({ success: true, data: issues });
    } catch (err) { next(err); }
  },
};

module.exports = IssuesController;