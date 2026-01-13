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
  const projects = await Project.find().populate('clientId', 'name email');
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
    project.projectName = req.body.projectName || project.projectName;
    project.description = req.body.description || project.description;
    project.status = req.body.status || project.status;
    project.expectedEndDate = req.body.expectedEndDate || project.expectedEndDate;
    
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

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject
};
