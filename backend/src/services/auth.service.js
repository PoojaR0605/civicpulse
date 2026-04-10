const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const UserModel = require('../models/user.model');

const AuthService = {
  generateAccessToken(user) {
    return jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  },

  generateRefreshToken(user) {
    return jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );
  },

  async register({ name, email, phone, password, role, department }) {
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      const err = new Error('Email already registered');
      err.statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await UserModel.create({
      name, email, phone, passwordHash, role, department,
    });

    const accessToken  = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await UserModel.saveRefreshToken(user.id, refreshToken, expiresAt);

    return { user, accessToken, refreshToken };
  },

  async login({ email, password }) {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    await UserModel.updateLastLogin(user.id);
    delete user.password_hash;

    const accessToken  = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await UserModel.saveRefreshToken(user.id, refreshToken, expiresAt);

    return { user, accessToken, refreshToken };
  },

  async refresh(token) {
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      const err = new Error('Invalid refresh token');
      err.statusCode = 401;
      throw err;
    }

    const stored = await UserModel.findRefreshToken(token);
    if (!stored) {
      const err = new Error('Refresh token expired or revoked');
      err.statusCode = 401;
      throw err;
    }

    await UserModel.deleteRefreshToken(token);

    const user            = await UserModel.findById(decoded.id);
    const accessToken     = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await UserModel.saveRefreshToken(user.id, newRefreshToken, expiresAt);

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(token, userId) {
    if (token) {
      await UserModel.deleteRefreshToken(token);
    } else {
      await UserModel.deleteAllRefreshTokens(userId);
    }
  },
};

module.exports = AuthService;