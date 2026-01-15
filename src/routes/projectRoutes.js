const express = require("express");
const router = express.Router();
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addNoteToProject,
  getProjectNotes,
  updateTimeline,
  getProjectActivity,
} = require("../controllers/projectController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const stageRoutes = require("./stageRoutes");

router
  .route("/")
  .get(protect, authorize("ADMIN", "TEAM", "CLIENT"), getProjects)
  .post(protect, authorize("ADMIN"), createProject);

router.put("/:id/timeline", protect, authorize("ADMIN"), updateTimeline);
router.get(
  "/:id/activity",
  protect,
  authorize("ADMIN", "CLIENT"),
  getProjectActivity
);

router
  .route("/:id")
  .get(protect, authorize("ADMIN", "TEAM", "CLIENT"), getProjectById)
  .put(protect, authorize("ADMIN", "TEAM"), updateProject)
  .delete(protect, authorize("ADMIN"), deleteProject);

router
  .route("/:id/note")
  .get(protect, authorize("ADMIN", "TEAM", "CLIENT"), getProjectNotes)
  .post(protect, authorize("ADMIN", "TEAM", "CLIENT"), addNoteToProject);

router.use("/:projectId/stages", stageRoutes);

module.exports = router;
