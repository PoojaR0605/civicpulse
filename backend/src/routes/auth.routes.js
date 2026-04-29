const express        = require('express');
const router         = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/register',    AuthController.register);
router.post('/login',       AuthController.login);
router.post('/send-otp',    AuthController.sendOtp);
router.post('/verify-otp',  AuthController.verifyOtp);
router.post('/refresh',     AuthController.refresh);
router.post('/logout',      authenticate, AuthController.logout);
router.get('/me',           authenticate, AuthController.me);

module.exports = router;