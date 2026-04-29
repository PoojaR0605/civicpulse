const redis = require('../config/redis');
const { logger } = require('../utils/logger');

const OTP_TTL     = 5 * 60;      // 5 minutes
const MAX_ATTEMPTS = 3;

const OTPService = {
  async generate(userId, email) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `otp:${userId}`;
    await redis.setEx(key, OTP_TTL, JSON.stringify({ otp, attempts: 0, email }));
    // Mock SMS/email — in prod replace with Twilio/SendGrid
    logger.info(`[OTP] Generated for ${email}: ${otp}`);
    return otp;
  },

  async verify(userId, inputOtp) {
    const key  = `otp:${userId}`;
    const raw  = await redis.get(key);
    if (!raw) return { valid: false, reason: 'OTP expired or not found' };

    const record = JSON.parse(raw);
    if (record.attempts >= MAX_ATTEMPTS) {
      await redis.del(key);
      return { valid: false, reason: 'Too many failed attempts. Request a new OTP.' };
    }
    if (record.otp !== inputOtp) {
      record.attempts++;
      const ttl = await redis.ttl(key);
      await redis.setEx(key, ttl, JSON.stringify(record));
      return { valid: false, reason: `Invalid OTP. ${MAX_ATTEMPTS - record.attempts} attempts remaining.` };
    }
    await redis.del(key);
    return { valid: true };
  },

  async resendAllowed(userId) {
    const cooldownKey = `otp:cooldown:${userId}`;
    const exists = await redis.get(cooldownKey);
    if (exists) return { allowed: false, reason: 'Please wait 60 seconds before requesting a new OTP.' };
    await redis.setEx(cooldownKey, 60, '1');
    return { allowed: true };
  },
};

module.exports = OTPService;