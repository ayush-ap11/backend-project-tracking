const express = require("express");
const router = express.Router();
const { registerUser, loginUser, logoutUser, getUsers } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/users", protect, authorize("ADMIN"), getUsers);

module.exports = router;
