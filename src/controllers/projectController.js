const Project = require('../models/Project');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const Note = require('../models/Note');
const ActivityLog = require('../models/ActivityLog');
const logActivity = require('../utils/logger');
const sanitizeProject = require('../utils/responseSanitizer');

// Helper to calculate status
const calculateStatus = (project, currentStatus) => {
  // If explicitly completed or cancelled or on hold, don't auto-change based on date unless necessary
  if (['COMPLETED', 'CANCELLED', 'ON_HOLD', 'PLANNED'].includes(currentStatus || project.status)) {
      return currentStatus || project.status;
  }
  
  const now = new Date();
  if (project.actualEndDate) return 'COMPLETED';
  if (project.startDate && now < new Date(project.startDate)) return 'NOT_STARTED';
  if (project.expectedEndDate && now > new Date(project.expectedEndDate)) return 'DELAYED';
  
  // If it was ACTIVE, keep it ACTIVE unless delayed/completed checks above hit.
  // Actually, standard logic for 'in progress' vs 'on track':
  return 'ON_TRACK';
};

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private (Admin only)
const createProject = asyncHandler(async (req, res) => {
  const { projectName, clientId, description, startDate, expectedEndDate, teamMembers, status } = req.body;
  const tempProject = { startDate, expectedEndDate };
  
  // Use provided status or calculate initial
  const initialStatus = status || calculateStatus(tempProject);

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
    // Only auto-update statuses that are time-sensitive and not manually overridden/static
    const staticStatuses = ['COMPLETED', 'CANCELLED', 'ON_HOLD', 'PLANNED', 'ACTIVE'];
    
    if (!staticStatuses.includes(p.status)) {
        const newStatus = calculateStatus(p, p.status);
        if (newStatus !== p.status) { 
             p.status = newStatus;
             await p.save();
        }
    }
    return sanitizeProject(p, req.user.role); 
  }));

  res.json(updatedProjects);
});

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('clientId', 'name email')
    .populate('teamMembers', 'name email role'); 

  if (project) {
    if (req.user.role !== 'ADMIN') {
      const isClient = project.clientId?.toString() === req.user._id.toString();
      const isTeam = project.teamMembers?.some(m => m._id.toString() === req.user._id.toString());
      if (!isClient && !isTeam) {
        res.status(403);
        throw new Error('Not authorized to view this project');
      }
    }
    // Auto-update status for single fetch too if needed, but getProjects handles bulk. 
    // Doing it here covers direct link access.
    const staticStatuses = ['COMPLETED', 'CANCELLED', 'ON_HOLD', 'PLANNED', 'ACTIVE'];
    if (!staticStatuses.includes(project.status)) {
         // Re-calc
         const newStatus = calculateStatus(project, project.status);
         if (newStatus !== project.status) {
             project.status = newStatus;
             await project.save();
         }
    }

    res.json(sanitizeProject(project, req.user.role)); 
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
    
    // Allow updating dates and status if Admin
    if (req.user.role === 'ADMIN') {
        if (req.body.clientId) project.clientId = req.body.clientId;
        
        let datesChanged = false;
        if (req.body.startDate && req.body.startDate !== project.startDate.toISOString()) {
            project.startDate = req.body.startDate;
            datesChanged = true;
        }
        if (req.body.expectedEndDate) {
            project.expectedEndDate = req.body.expectedEndDate;
            datesChanged = true;
        }

        // If status is manually provided, use it
        if (req.body.status) {
            project.status = req.body.status;
        } else if (datesChanged) {
            // If dates changed and no status provided, re-calc ONLY if not in a static state or if intended to refresh
            // But user might want to keep 'ACTIVE'. let's blindly re-calc only if it was time-dependent
            if (!['COMPLETED', 'CANCELLED', 'ON_HOLD'].includes(project.status)) {
                project.status = calculateStatus(project, project.status);
            }
        }
    }

    if (req.body.teamMembers) project.teamMembers = req.body.teamMembers;

    const updatedProject = await project.save();
    
    await logActivity(project._id, req.user._id, 'UPDATED_PROJECT', 'Project details updated');

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
  
  // Here we strongly force status recalc or manual override could be added but usually timeline update implies status check
  project.status = calculateStatus(project, project.status);

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

// @desc    Get project notes
// @route   GET /api/projects/:id/note
// @access  Private (Admin, Client, Team)
const getProjectNotes = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  // Access check
  if (req.user.role !== 'ADMIN') {
    const isClient = project.clientId?.toString() === req.user._id.toString();
    const isTeam = project.teamMembers?.some(m => m.toString() === req.user._id.toString());
    if (!isClient && !isTeam) {
      res.status(403);
      throw new Error('Not authorized to access this project');
    }
  }

  let query = { projectId: req.params.id };
  // If client, hide internal notes
  if (req.user.role === 'CLIENT') {
    query.isInternal = { $ne: true };
  }

  const notes = await Note.find(query)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email role');

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
  getProjectActivity
};
