const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isInternal: {
    type: Boolean,
    default: false, // Default false so Clients can see unless specified
  }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
