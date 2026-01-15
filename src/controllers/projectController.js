const Project = require("../models/Project");
const asyncHandler = require("../middleware/asyncHandler");
const Note = require("../models/Note");
const ActivityLog = require("../models/ActivityLog");
const logActivity = require("../utils/logger");
const sanitizeProject = require("../utils/responseSanitizer");

const FIXED_STATUSES = [
  "COMPLETED",
  "CANCELLED",
  "ON_HOLD",
  "PLANNED",
  "ACTIVE",
];

const calculateStatus = (project, currentStatus) => {
  const status = currentStatus || project.status;
  if (FIXED_STATUSES.includes(status)) {
    return status;
  }

  const now = new Date();
  if (project.actualEndDate) {
    return "COMPLETED";
  }
  if (project.startDate && now < new Date(project.startDate)) {
    return "NOT_STARTED";
  }
  if (project.expectedEndDate && now > new Date(project.expectedEndDate)) {
    return "DELAYED";
  }
  return "ON_TRACK";
};

const createProject = asyncHandler(async (req, res) => {
  const {
    projectName,
    clientId,
    description,
    startDate,
    expectedEndDate,
    teamMembers,
    status,
  } = req.body;
  const tempProject = { startDate, expectedEndDate };

  const initialStatus = status || calculateStatus(tempProject);

  const project = await Project.create({
    projectName,
    clientId,
    description,
    startDate,
    expectedEndDate,
    teamMembers,
    status: initialStatus,
  });

  await logActivity(
    project._id,
    req.user._id,
    "CREATED_PROJECT",
    "Project created"
  );

  res.status(201).json(project);
});

const getProjects = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role === "CLIENT") {
    filter = { clientId: req.user._id };
  } else if (req.user.role === "TEAM") {
    filter = { teamMembers: req.user._id };
  }

  const projects = await Project.find(filter).populate(
    "clientId",
    "name email"
  );

  const updatedProjects = await Promise.all(
    projects.map(async (project) => {
      if (!FIXED_STATUSES.includes(project.status)) {
        const newStatus = calculateStatus(project, project.status);
        if (newStatus !== project.status) {
          project.status = newStatus;
          await project.save();
        }
      }
      return sanitizeProject(project, req.user.role);
    })
  );

  res.json(updatedProjects);
});

const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate("clientId", "name email")
    .populate("teamMembers", "name email role");

  if (project) {
    if (req.user.role !== "ADMIN") {
      const clientId = project.clientId._id || project.clientId;
      const isClient = clientId.toString() === req.user._id.toString();
      const isTeam = project.teamMembers?.some((member) => {
        const memberId = member._id || member;
        return memberId.toString() === req.user._id.toString();
      });

      if (!isClient && !isTeam) {
        res.status(403);
        throw new Error("Not authorized to view this project");
      }
    }

    if (!FIXED_STATUSES.includes(project.status)) {
      const newStatus = calculateStatus(project, project.status);
      if (newStatus !== project.status) {
        project.status = newStatus;
        await project.save();
      }
    }

    res.json(sanitizeProject(project, req.user.role));
  } else {
    res.status(404);
    throw new Error("Project not found");
  }
});

const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (project) {
    if (req.user.role === "TEAM") {
      const isTeam = project.teamMembers.some(
        (member) => member.toString() === req.user._id.toString()
      );
      if (!isTeam) {
        res.status(403);
        throw new Error("Not authorized to update this project");
      }
    }

    project.projectName = req.body.projectName || project.projectName;
    project.description = req.body.description || project.description;

    if (req.user.role === "ADMIN") {
      if (req.body.clientId) {
        project.clientId = req.body.clientId;
      }

      let shouldRecalculate = false;
      if (req.body.startDate) {
        project.startDate = req.body.startDate;
        shouldRecalculate = true;
      }
      if (req.body.expectedEndDate) {
        project.expectedEndDate = req.body.expectedEndDate;
        shouldRecalculate = true;
      }

      if (req.body.status) {
        project.status = req.body.status;
        shouldRecalculate = false;
      }

      if (
        shouldRecalculate &&
        !["COMPLETED", "CANCELLED", "ON_HOLD"].includes(project.status)
      ) {
        project.status = calculateStatus(project, project.status);
      }
    }

    if (req.body.progress !== undefined) {
      project.progress = req.body.progress;
    }

    if (req.body.teamMembers) {
      project.teamMembers = req.body.teamMembers;
    }

    const updatedProject = await project.save();

    await logActivity(
      project._id,
      req.user._id,
      "UPDATED_PROJECT",
      "Project details updated"
    );

    res.json(updatedProject);
  } else {
    res.status(404);
    throw new Error("Project not found");
  }
});

const updateTimeline = asyncHandler(async (req, res) => {
  const { expectedEndDate, actualEndDate, delayReason, startDate } = req.body;
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  if (startDate) project.startDate = startDate;
  if (expectedEndDate) project.expectedEndDate = expectedEndDate;
  if (actualEndDate) project.actualEndDate = actualEndDate;
  if (delayReason) project.delayReason = delayReason;

  project.status = calculateStatus(project, project.status);

  const updatedProject = await project.save();

  await logActivity(
    project._id,
    req.user._id,
    "UPDATED_TIMELINE",
    `Status: ${project.status}`
  );

  res.json(updatedProject);
});

const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (project) {
    await logActivity(
      project._id,
      req.user._id,
      "DELETED_PROJECT",
      `Project ${project.projectName} deleted`
    );

    await project.deleteOne();
    res.json({ message: "Project removed" });
  } else {
    res.status(404);
    throw new Error("Project not found");
  }
});

const addNoteToProject = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const project = await Project.findById(req.params.id);

  if (project) {
    if (req.user.role !== "ADMIN") {
      const isClient = project.clientId.toString() === req.user._id.toString();
      const isTeam = project.teamMembers.some(
        (member) => member.toString() === req.user._id.toString()
      );
      if (!isClient && !isTeam) {
        res.status(403);
        throw new Error("Not authorized to access this project");
      }
    }

    const note = await Note.create({
      projectId: req.params.id,
      content,
      createdBy: req.user._id,
    });

    await logActivity(
      project._id,
      req.user._id,
      "ADDED_NOTE",
      "New note added"
    );

    res.status(201).json(note);
  } else {
    res.status(404);
    throw new Error("Project not found");
  }
});

const getProjectActivity = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  if (req.user.role !== "ADMIN") {
    const isClient = project.clientId?.toString() === req.user._id.toString();
    if (!isClient) {
      res.status(403);
      throw new Error("Not authorized to view activity logs");
    }
  }

  const logs = await ActivityLog.find({ projectId: req.params.id })
    .sort({ createdAt: -1 })
    .populate("userId", "name email role");

  res.json(logs);
});

const getProjectNotes = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  if (req.user.role !== "ADMIN") {
    const isClient = project.clientId?.toString() === req.user._id.toString();
    const isTeam = project.teamMembers?.some(
      (member) => member.toString() === req.user._id.toString()
    );
    if (!isClient && !isTeam) {
      res.status(403);
      throw new Error("Not authorized to access this project");
    }
  }

  let query = { projectId: req.params.id };
  if (req.user.role === "CLIENT") {
    query.isInternal = { $ne: true };
  }

  const notes = await Note.find(query)
    .sort({ createdAt: -1 })
    .populate("createdBy", "name email role");

  res.json(notes);
});

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addNoteToProject,
  getProjectNotes,
  updateTimeline,
  getProjectActivity,
};
