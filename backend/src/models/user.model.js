const { pool } = require('../config/db');

const UserModel = {
  async findByEmail(email) {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE email = $1 AND is_active = TRUE LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, role, ward_id, department,
              is_verified, is_active, created_at
       FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async create({ name, email, phone, passwordHash, role = 'citizen', wardId, department }) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role, ward_id, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, phone, role, ward_id, department, created_at`,
      [name, email, phone || null, passwordHash, role, wardId || null, department || null]
    );
    return rows[0];
  },

  async updateFcmToken(userId, fcmToken) {
    await pool.query(
      `UPDATE users SET fcm_token = $1 WHERE id = $2`,
      [fcmToken, userId]
    );
  },

  async updateLastLogin(userId) {
    await pool.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
      [userId]
    );
  },

  async saveRefreshToken(userId, token, expiresAt) {
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );
  },

  async findRefreshToken(token) {
    const { rows } = await pool.query(
      `SELECT rt.*, u.id as user_id, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.expires_at > NOW()
       LIMIT 1`,
      [token]
    );
    return rows[0] || null;
  },

  async deleteRefreshToken(token) {
    await pool.query(
      `DELETE FROM refresh_tokens WHERE token = $1`,
      [token]
    );
  },

  async deleteAllRefreshTokens(userId) {
    await pool.query(
      `DELETE FROM refresh_tokens WHERE user_id = $1`,
      [userId]
    );
  },
};

module.exports = UserModel;