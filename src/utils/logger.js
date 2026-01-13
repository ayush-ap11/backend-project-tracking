const ActivityLog = require('../models/ActivityLog');

const logActivity = async (projectId, userId, action, details) => {
  try {
    if (!projectId || !userId || !action) return;
    
    await ActivityLog.create({
      projectId,
      userId,
      action,
      details
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid blocking the main action
  }
};

module.exports = logActivity;
