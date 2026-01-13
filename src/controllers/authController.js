const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const asyncHandler = require("../middleware/asyncHandler");

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, experienceYears } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400);
    throw new Error("Please fill all required fields");
  }

  // Enforce validation for TEAM role
  if (role === "TEAM" && !experienceYears) {
    res.status(400);
    throw new Error("Experience years is required for TEAM role");
  }

  // Enforce Single Admin Policy
  if (role === "ADMIN") {
    const adminExists = await User.findOne({ role: "ADMIN" });
    if (adminExists) {
      res.status(400);
      throw new Error("An Admin already exists");
    }
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    phone,
    passwordHash,
    role,
    experienceYears,
  });

  if (user) {
    generateToken(res, user._id, user.role);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please add email and password");
  }

  const user = await User.findOne({ email });

  if (
    user &&
    user.passwordHash &&
    (await bcrypt.compare(password, user.passwordHash))
  ) {
    if (!user.isActive) {
      res.status(401);
      throw new Error("User account is inactive");
    }

    generateToken(res, user._id, user.role);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logged out successfully" });
};

module.exports = { registerUser, loginUser, logoutUser };
