const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Wards list — Phase 1 schema' });
});

router.get('/locate', (req, res) => {
  // Usage: GET /wards/locate?lat=12.97&lng=77.59
  const { lat, lng } = req.query;
  res.json({
    success: true,
    message: 'Ward locator — after PostGIS setup',
    received: { lat, lng },
  });
});

module.exports = router;