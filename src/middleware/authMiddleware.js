const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("./asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  token = req.cookies.jwt;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-passwordHash");
      next();
    } catch (error) {
      res.status(401);
      throw new Error("Not authorized, invalid token");
    }
  } else {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

module.exports = { protect };
