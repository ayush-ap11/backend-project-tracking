const express = require('express');
const router = express.Router();
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addNoteToProject
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Get all projects: Admin, Team, Client
// Create project: Admin only
router.route('/')
  .get(protect, authorize('ADMIN', 'TEAM', 'CLIENT'), getProjects)
  .post(protect, authorize('ADMIN'), createProject);

// ID operations
// Get: Admin, Team, Client
// Put: Admin, Team
// Delete: Admin only
router.route('/:id')
  .get(protect, authorize('ADMIN', 'TEAM', 'CLIENT'), getProjectById)
  .put(protect, authorize('ADMIN', 'TEAM'), updateProject)
  .delete(protect, authorize('ADMIN'), deleteProject);

// Note/Comment: Client (and Admin/Team)
router.route('/:id/note')
  .post(protect, authorize('ADMIN', 'TEAM', 'CLIENT'), addNoteToProject);

module.exports = router;
