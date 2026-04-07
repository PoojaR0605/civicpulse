const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Issues list — Phase 2' });
});

router.post('/', (req, res) => {
  res.json({ success: true, message: 'Submit issue — Phase 2' });
});

router.get('/:id', (req, res) => {
  res.json({ success: true, data: null, message: 'Issue detail — Phase 2' });
});

router.patch('/:id/status', (req, res) => {
  res.json({ success: true, message: 'Update status — Phase 2' });
});

module.exports = router;