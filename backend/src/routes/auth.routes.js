const express = require('express');
const router = express.Router();

// Stubs — full implementation in Phase 2
router.post('/register', (req, res) => {
  res.json({ success: true, message: 'Register stub — Phase 2' });
});

router.post('/login', (req, res) => {
  res.json({ success: true, message: 'Login stub — Phase 2' });
});

router.post('/refresh', (req, res) => {
  res.json({ success: true, message: 'Refresh stub — Phase 2' });
});

module.exports = router;