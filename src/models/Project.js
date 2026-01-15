const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true,
  },
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true 
  },
  description: String,
  startDate: {
    type: Date,
    default: Date.now
  },
  expectedEndDate: Date,
  actualEndDate: Date,
  delayReason: String,
  status: {
    type: String,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'ON_TRACK', 'DELAYED', 'COMPLETED', 'CANCELLED', 'PLANNED', 'ACTIVE', 'ON_HOLD'],
    default: 'NOT_STARTED'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  teamMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);
