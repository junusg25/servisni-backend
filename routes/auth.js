const express = require("express");
const {
  loginUser,
  logoutUser,
  registerUser,
} = require("../controllers/authController");
const router = express.Router();

// ✅ Register User
router.post("/register", registerUser);

// ✅ User Login
router.post("/login", loginUser);

// ✅ User Logout
router.post("/logout", logoutUser);

module.exports = router;
