const Project = require('../models/Project');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const Note = require('../models/Note');
const ActivityLog = require('../models/ActivityLog');
const logActivity = require('../utils/logger');
const sanitizeProject = require('../utils/responseSanitizer');

// Helper to calculate status
const calculateStatus = (project) => {
  const now = new Date();
  if (project.actualEndDate) return 'COMPLETED';
  if (project.startDate && now < new Date(project.startDate)) return 'NOT_STARTED';
  if (project.expectedEndDate && now > new Date(project.expectedEndDate)) return 'DELAYED';
  return 'ON_TRACK';
};

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private (Admin only)
const createProject = asyncHandler(async (req, res) => {
  const { projectName, clientId, description, startDate, expectedEndDate, teamMembers } = req.body;
  const tempProject = { startDate, expectedEndDate };
  const initialStatus = calculateStatus(tempProject);

  const project = await Project.create({
    projectName,
    clientId,
    description,
    startDate,
    expectedEndDate,
    teamMembers,
    status: initialStatus
  });

  await logActivity(project._id, req.user._id, 'CREATED_PROJECT', `Project created`);

  res.status(201).json(project);
});

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role === 'CLIENT') query = { clientId: req.user._id };
  else if (req.user.role === 'TEAM') query = { teamMembers: req.user._id };

  const projects = await Project.find(query).populate('clientId', 'name email');
  
  // Status check (simplified to avoid mass writes on every read if possible, but keeping requirement)
  const updatedProjects = await Promise.all(projects.map(async (p) => {
    const newStatus = calculateStatus(p);
    if (newStatus !== p.status && p.status !== 'CANCELLED' && p.status !== 'COMPLETED') { 
       if (p.status !== 'CANCELLED') {
         p.status = newStatus;
         await p.save();
       }
    }
    return sanitizeProject(p, req.user.role); // Sanitize
  }));

  res.json(updatedProjects);
});

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('clientId', 'name email')
    .populate('teamMembers', 'name email role'); // Populating team members might expose info, sanitized later

  if (project) {
    if (req.user.role !== 'ADMIN') {
      const isClient = project.clientId?.toString() === req.user._id.toString();
      const isTeam = project.teamMembers?.some(m => m._id.toString() === req.user._id.toString());
      if (!isClient && !isTeam) {
        res.status(403);
        throw new Error('Not authorized to view this project');
      }
    }
    res.json(sanitizeProject(project, req.user.role)); // Sanitize
  } else {
    res.status(404);
    throw new Error('Project not found');
  }
});

// @desc    Update project (General info)
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (project) {
    if (req.user.role === 'TEAM') {
      const isTeam = project.teamMembers.some(m => m.toString() === req.user._id.toString());
      if (!isTeam) {
        res.status(403);
        throw new Error('Not authorized to update this project');
      }
    }

    project.projectName = req.body.projectName || project.projectName;
    project.description = req.body.description || project.description;
    if (req.body.teamMembers) project.teamMembers = req.body.teamMembers;
    if (req.body.clientId && req.user.role === 'ADMIN') project.clientId = req.body.clientId;

    const updatedProject = await project.save();
    
    await logActivity(project._id, req.user._id, 'UPDATED_PROJECT', 'General details updated');

    res.json(updatedProject);
  } else {
    res.status(404);
    throw new Error('Project not found');
  }
});

// @desc    Update project timeline
// @route   PUT /api/projects/:id/timeline
// @access  Private (Admin Only)
const updateTimeline = asyncHandler(async (req, res) => {
  const { expectedEndDate, actualEndDate, delayReason, startDate } = req.body;
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  if (startDate) project.startDate = startDate;
  if (expectedEndDate) project.expectedEndDate = expectedEndDate;
  if (actualEndDate) project.actualEndDate = actualEndDate;
  if (delayReason) project.delayReason = delayReason;
  project.status = calculateStatus(project);

  const updatedProject = await project.save();
  
  await logActivity(project._id, req.user._id, 'UPDATED_TIMELINE', `Status: ${project.status}`);

  res.json(updatedProject);
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (project) {
    // Log before delete (though project is gone, log might persist depending on cascade logic, usually logs kept)
    // Actually, if project is deleted, logs with that ID might be orphans. 
    // Usually in audit systems we keep the logs. 
    await logActivity(project._id, req.user._id, 'DELETED_PROJECT', `Project ${project.projectName} deleted`);
    
    await project.deleteOne();
    res.json({ message: 'Project removed' });
  } else {
    res.status(404);
    throw new Error('Project not found');
  }
});

// @desc    Add note to project
// @route   POST /api/projects/:id/note
// @access  Private (Client, Admin, Team)
const addNoteToProject = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const project = await Project.findById(req.params.id);

  if (project) {
    if (req.user.role !== 'ADMIN') {
      const isClient = project.clientId.toString() === req.user._id.toString();
      const isTeam = project.teamMembers.some(m => m.toString() === req.user._id.toString());
      if (!isClient && !isTeam) {
        res.status(403);
        throw new Error('Not authorized to access this project');
      }
    }

    const note = await Note.create({
      projectId: req.params.id,
      content,
      createdBy: req.user._id
    });

    await logActivity(project._id, req.user._id, 'ADDED_NOTE', 'New note added');

    res.status(201).json(note);
  } else {
    res.status(404);
    throw new Error('Project not found');
  }
});

// @desc    Get project activity logs
// @route   GET /api/projects/:id/activity
// @access  Private (Admin, Client)
const getProjectActivity = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  // Access Check
  if (req.user.role !== 'ADMIN') {
    const isClient = project.clientId?.toString() === req.user._id.toString();
    // Assuming Team shouldn't see logs? Req says "ADMIN & CLIENT can view logs".
    // I will stick to Admin & Client.
    if (!isClient) {
      res.status(403);
      throw new Error('Not authorized to view activity logs');
    }
  }

  const logs = await ActivityLog.find({ projectId: req.params.id })
    .sort({ createdAt: -1 })
    .populate('userId', 'name email role');

  res.json(logs);
});

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addNoteToProject,
  updateTimeline,
  getProjectActivity
};
