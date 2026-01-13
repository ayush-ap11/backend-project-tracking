const express = require('express');
const router = express.Router();
const {
  getAdminDashboard,
  getClientDashboard
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/admin', protect, authorize('ADMIN'), getAdminDashboard);
router.get('/client', protect, authorize('CLIENT'), getClientDashboard);

module.exports = router;
