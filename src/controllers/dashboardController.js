const Project = require("../models/Project");
const asyncHandler = require("../middleware/asyncHandler");

const getAdminDashboard = asyncHandler(async (_req, res) => {
  const projects = await Project.find({});

  const stats = {
    totalProjects: projects.length,
    completed: projects.filter((project) => project.status === "COMPLETED")
      .length,
    delayed: projects.filter((project) => project.status === "DELAYED").length,
    active: projects.filter(
      (project) =>
        project.status === "ON_TRACK" || project.status === "IN_PROGRESS"
    ).length,
    avgCompletionTime: 0,
  };

  let completedCount = 0;
  let totalTime = 0;

  projects.forEach((project) => {
    if (
      project.status === "COMPLETED" &&
      project.actualEndDate &&
      project.startDate
    ) {
      const diff =
        new Date(project.actualEndDate) - new Date(project.startDate);
      totalTime += diff;
      completedCount += 1;
    }
  });

  if (completedCount > 0) {
    const avgMs = totalTime / completedCount;
    stats.avgCompletionTime = Math.round(avgMs / (1000 * 60 * 60 * 24));
  }

  res.json(stats);
});

const getClientDashboard = asyncHandler(async (req, res) => {
  const projects = await Project.find({ clientId: req.user._id });

  const stats = {
    totalAssigned: projects.length,
    completed: projects.filter((project) => project.status === "COMPLETED")
      .length,
    delayed: projects.filter((project) => project.status === "DELAYED").length,
    active: projects.filter(
      (project) =>
        project.status === "ON_TRACK" || project.status === "IN_PROGRESS"
    ).length,
    projectsOverview: projects.map((project) => ({
      name: project.projectName,
      status: project.status,
      id: project._id,
    })),
  };

  res.json(stats);
});

module.exports = {
  getAdminDashboard,
  getClientDashboard,
};
