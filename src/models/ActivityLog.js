const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true, 
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String, // e.g., 'CREATED_PROJECT', 'UPDATED_TIMELINE'
    required: true,
  },
  details: {
    type: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
