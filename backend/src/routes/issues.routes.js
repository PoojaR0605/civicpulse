const express           = require('express');
const router            = express.Router();
const IssuesController  = require('../controllers/issues.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas }       = require('../middleware/validate');
const upload                      = require('../middleware/upload');

router.get('/analytics',
  authenticate,
  authorize('officer', 'admin'),
  IssuesController.getAnalytics
);

router.get('/',     authenticate, IssuesController.getAll);
router.get('/mine', authenticate, IssuesController.getMyIssues);
router.get('/:id',  authenticate, IssuesController.getById);

router.post('/',
  authenticate,
  upload.single('photo'),
  validate(schemas.submitIssue),
  IssuesController.submit
);

router.patch('/:id/status',
  authenticate,
  authorize('officer', 'admin'),
  validate(schemas.updateStatus),
  IssuesController.updateStatus
);

router.post('/:id/vote', authenticate, IssuesController.vote);

module.exports = router;