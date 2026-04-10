const WardsService = require('../services/wards.service');

const WardsController = {
  async getAll(req, res, next) {
    try {
      const wards = await WardsService.getAll(req.query.city);
      res.json({ success: true, data: wards });
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const ward = await WardsService.getById(req.params.id);
      res.json({ success: true, data: ward });
    } catch (err) { next(err); }
  },

  async locate(req, res, next) {
    try {
      const { lat, lng } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: 'lat and lng query params are required',
        });
      }
      const ward = await WardsService.locateWard(parseFloat(lat), parseFloat(lng));
      res.json({ success: true, data: ward });
    } catch (err) { next(err); }
  },

  async getStats(req, res, next) {
    try {
      const stats = await WardsService.getStats(req.params.id);
      res.json({ success: true, data: stats });
    } catch (err) { next(err); }
  },
};

module.exports = WardsController;