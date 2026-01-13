const Project = require('../models/Project');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private (Admin only - logical, but not enforced by middleware yet)
const createProject = asyncHandler(async (req, res) => {
  const { projectName, clientId, description, startDate, expectedEndDate, teamMembers } = req.body;

  const project = await Project.create({
    projectName,
    clientId,
    description,
    startDate,
    expectedEndDate,
    teamMembers
  });

  res.status(201).json(project);
});

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = asyncHandler(async (req, res) => {
  let query = {};

  if (req.user.role === 'CLIENT') {
    query = { clientId: req.user._id };
  } else if (req.user.role === 'TEAM') {
    query = { teamMembers: req.user._id };
  }
  // ADMIN sees all (empty query)

  const projects = await Project.find(query).populate('clientId', 'name email');
  res.json(projects);
});

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('clientId', 'name email')
    .populate('teamMembers', 'name email role');

  if (project) {
    // Access Control
    if (req.user.role !== 'ADMIN') {
      const isClient = project.clientId.toString() === req.user._id.toString();
      const isTeam = project.teamMembers.some(
        (member) => member._id.toString() === req.user._id.toString()
      );

      if (!isClient && !isTeam) {
        res.status(403);
        throw new Error('Not authorized to view this project');
      }
    }
    res.json(project);
  } else {
    res.status(404);
    throw new Error('Project not found');
  }
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (project) {
    // Access Control (Team Member check)
    if (req.user.role === 'TEAM') {
      const isTeam = project.teamMembers.some(
        (member) => member.toString() === req.user._id.toString()
      );
      if (!isTeam) {
        res.status(403);
        throw new Error('Not authorized to update this project');
      }
    }
    // Admin always allowed

    project.projectName = req.body.projectName || project.projectName;
    project.description = req.body.description || project.description;
    project.status = req.body.status || project.status;
    project.expectedEndDate = req.body.expectedEndDate || project.expectedEndDate;
    if (req.body.clientId) project.clientId = req.body.clientId; // Should usually be Admin only
    
    if (req.body.teamMembers) {
      project.teamMembers = req.body.teamMembers;
    }

    const updatedProject = await project.save();
    res.json(updatedProject);
  } else {
    res.status(404);
    throw new Error('Project not found');
  }
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (project) {
    await project.deleteOne();
    res.json({ message: 'Project removed' });
  } else {
    res.status(404);
    throw new Error('Project not found');
  }
});

const Note = require('../models/Note');

// @desc    Add note to project
// @route   POST /api/projects/:id/note
// @access  Private (Client, Admin, Team)
const addNoteToProject = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const project = await Project.findById(req.params.id);

  if (project) {
    // Access Control
    if (req.user.role !== 'ADMIN') {
      const isClient = project.clientId.toString() === req.user._id.toString();
      const isTeam = project.teamMembers.some(
        (member) => member.toString() === req.user._id.toString()
      );

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
    res.status(201).json(note);
  } else {
    res.status(404);
    throw new Error('Project not found');
  }
});

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addNoteToProject
};
