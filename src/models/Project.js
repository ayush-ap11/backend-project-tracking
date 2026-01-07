const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  projectName: String,
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  startDate: Date,
  expectedEndDate: Date,
  status: String
}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);
