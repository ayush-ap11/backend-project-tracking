const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  passwordHash: String,
  role: {
    type: String,
    enum: ["ADMIN", "CLIENT", "TEAM"],
    required: true
  },
  experienceYears: Number,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
