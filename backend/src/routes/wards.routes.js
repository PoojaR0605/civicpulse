const express          = require('express');
const router           = express.Router();
const WardsController  = require('../controllers/wards.controller');
const { authenticate } = require('../middleware/auth');

router.get('/',           authenticate, WardsController.getAll);
router.get('/locate',     authenticate, WardsController.locate);
router.get('/:id',        authenticate, WardsController.getById);
router.get('/:id/stats',  authenticate, WardsController.getStats);

module.exports = router;