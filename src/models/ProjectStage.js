const mongoose = require('mongoose');

const projectStageSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'],
    default: 'NOT_STARTED',
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  order: {
    type: Number,
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('ProjectStage', projectStageSchema);
