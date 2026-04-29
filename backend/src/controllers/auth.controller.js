const AuthService = require('../services/auth.service');
const OTPService  = require('../services/otp.service');
const UserModel   = require('../models/user.model');

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

  // Send OTP to registered email
  async sendOtp(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

      const user = await UserModel.findByEmail(email);
      if (!user) return res.status(404).json({ success: false, message: 'No account found with this email' });

      const cooldown = await OTPService.resendAllowed(user.id);
      if (!cooldown.allowed) return res.status(429).json({ success: false, message: cooldown.reason });

      const otp = await OTPService.generate(user.id, email);

      res.json({
        success: true,
        message: `OTP sent to ${email}`,
        // Remove debug_otp in production
        debug_otp: otp,
        expires_in: '5 minutes',
      });
    } catch (err) { next(err); }
  },

  // Verify OTP and return tokens
  async verifyOtp(req, res, next) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

      const user = await UserModel.findByEmail(email);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const result = await OTPService.verify(user.id, otp);
      if (!result.valid) return res.status(400).json({ success: false, message: result.reason });

      // Mark user as verified
      await UserModel.updateVerified(user.id);

      const accessToken  = AuthService.generateAccessToken(user);
      const refreshToken = AuthService.generateRefreshToken(user);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await UserModel.saveRefreshToken(user.id, refreshToken, expiresAt);

      res.json({
        success: true,
        message: 'OTP verified successfully',
        data: { user, accessToken, refreshToken },
      });
    } catch (err) { next(err); }
  },

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });
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