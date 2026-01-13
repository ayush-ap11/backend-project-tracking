const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  entityType: {
    type: String, // Project, Note, Stage
    required: true,
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  details: {
    type: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
