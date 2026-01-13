const mongoose = require('mongoose');

const projectStageSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  name: {
    type: String,
    required: true, // e.g., 'Planning', 'Development', 'Testing'
  },
  order: {
    type: Number,
    required: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

module.exports = mongoose.model('ProjectStage', projectStageSchema);
