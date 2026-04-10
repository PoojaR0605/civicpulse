const express        = require('express');
const router         = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authenticate }     = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.post('/register', validate(schemas.register), AuthController.register);
router.post('/login',    validate(schemas.login),    AuthController.login);
router.post('/refresh',                              AuthController.refresh);
router.post('/logout',   authenticate,               AuthController.logout);
router.get('/me',        authenticate,               AuthController.me);

module.exports = router;