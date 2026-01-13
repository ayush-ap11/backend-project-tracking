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
  status: {
    type: String,
    enum: ['Active', 'Completed', 'On Hold', 'Cancelled'],
    default: 'Active'
  },
  teamMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);
