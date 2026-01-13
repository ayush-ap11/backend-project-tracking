const express = require('express');
const router = express.Router({ mergeParams: true }); // Important for accessing :projectId
const {
  addStage,
  getStages,
  updateStage,
  deleteStage
} = require('../controllers/stageController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Route: /api/projects/:projectId/stages

router.route('/')
  .post(protect, authorize('ADMIN'), addStage)
  .get(protect, authorize('ADMIN', 'TEAM', 'CLIENT'), getStages);

router.route('/:id')
  .put(protect, authorize('ADMIN', 'TEAM'), updateStage)
  .delete(protect, authorize('ADMIN'), deleteStage);

module.exports = router;
