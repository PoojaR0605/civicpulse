const WardModel = require('../models/ward.model');

const WardsService = {
  async getAll(city) {
    return WardModel.findAll(city);
  },

  async getById(id) {
    const ward = await WardModel.findById(id);
    if (!ward) {
      const err = new Error('Ward not found');
      err.statusCode = 404;
      throw err;
    }
    return ward;
  },

  async locateWard(lat, lng) {
    if (lat < 6 || lat > 37 || lng < 68 || lng > 97) {
      const err = new Error('Coordinates appear to be outside India');
      err.statusCode = 400;
      throw err;
    }

    const ward = await WardModel.findByCoordinates(lat, lng);
    if (!ward) {
      const err = new Error('No ward found for these coordinates');
      err.statusCode = 404;
      throw err;
    }

    return ward;
  },

  async getStats(wardId) {
    return WardModel.getStats(wardId);
  },
};

module.exports = WardsService;