const ProjectStage = require("../models/ProjectStage");
const Project = require("../models/Project");
const asyncHandler = require("../middleware/asyncHandler");
const logActivity = require("../utils/logger");

const addStage = asyncHandler(async (req, res) => {
  const { name, description, assignedTo, order, status, progress } = req.body;
  const projectId = req.params.projectId;

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  const stage = await ProjectStage.create({
    projectId,
    name,
    description,
    assignedTo,
    order,
    status,
    progress,
  });

  await logActivity(
    projectId,
    req.user._id,
    "ADDED_STAGE",
    `Stage '${name}' added`
  );

  res.status(201).json(stage);
});
const getStages = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  if (req.user.role !== "ADMIN") {
    const isClient = project.clientId?.toString() === req.user._id.toString();
    const isTeam = project.teamMembers?.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (!isClient && !isTeam) {
      res.status(403);
      throw new Error("Not authorized to view stages of this project");
    }
  }

  const stages = await ProjectStage.find({ projectId })
    .sort({ order: 1 })
    .populate("assignedTo", "name email");

  res.json(stages);
});

const updateStage = asyncHandler(async (req, res) => {
  const stage = await ProjectStage.findById(req.params.id);

  if (!stage) {
    res.status(404);
    throw new Error("Stage not found");
  }

  if (req.user.role === "TEAM") {
    if (stage.assignedTo?.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You can only update stages assigned to you");
    }
    stage.status = req.body.status || stage.status;
    stage.progress =
      req.body.progress !== undefined ? req.body.progress : stage.progress;
  } else if (req.user.role === "ADMIN") {
    stage.name = req.body.name || stage.name;
    stage.description = req.body.description || stage.description;
    stage.assignedTo = req.body.assignedTo || stage.assignedTo;
    stage.order = req.body.order !== undefined ? req.body.order : stage.order;
    stage.status = req.body.status || stage.status;
    stage.progress =
      req.body.progress !== undefined ? req.body.progress : stage.progress;
  } else {
    res.status(403);
    throw new Error("Not authorized to update stages");
  }

  const updatedStage = await stage.save();

  await logActivity(
    stage.projectId,
    req.user._id,
    "UPDATED_STAGE",
    `Stage '${updatedStage.name}' updated`
  );

  res.json(updatedStage);
});
const deleteStage = asyncHandler(async (req, res) => {
  const stage = await ProjectStage.findById(req.params.id);

  if (!stage) {
    res.status(404);
    throw new Error("Stage not found");
  }

  await logActivity(
    stage.projectId,
    req.user._id,
    "DELETED_STAGE",
    `Stage '${stage.name}' deleted`
  );
  await stage.deleteOne();

  res.json({ message: "Stage removed" });
});

module.exports = {
  addStage,
  getStages,
  updateStage,
  deleteStage,
};
