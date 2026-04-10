const AuthService = require('../services/auth.service');

const AuthController = {
  async register(req, res, next) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.register(req.body);
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: { user, accessToken, refreshToken },
      });
    } catch (err) { next(err); }
  },

  async login(req, res, next) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.login(req.body);
      res.json({
        success: true,
        message: 'Login successful',
        data: { user, accessToken, refreshToken },
      });
    } catch (err) { next(err); }
  },

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token required' });
      }
      const tokens = await AuthService.refresh(refreshToken);
      res.json({ success: true, data: tokens });
    } catch (err) { next(err); }
  },

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      await AuthService.logout(refreshToken, req.user.id);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) { next(err); }
  },

  async me(req, res) {
    res.json({ success: true, data: { user: req.user } });
  },
};

module.exports = AuthController;