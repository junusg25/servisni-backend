const express = require("express");
const {
  getMyProfile,
  updateMyProfile,
  getAllProfiles,
} = require("../controllers/profileController");
const authenticateToken = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/adminMiddleware");

const router = express.Router();

// Routes
router.get("/me", authenticateToken, getMyProfile); // Get logged-in user profile
router.put("/me", authenticateToken, updateMyProfile); // Update own profile

// Only Admins can see all profiles, others are redirected to their profile page
router.get(
  "/",
  authenticateToken,
  async (req, res, next) => {
    if (req.user.role !== "admin") {
      try {
        // Fetch user's full name
        const userProfile = await req.db.query(
          "SELECT full_name FROM profiles WHERE user_id = $1",
          [req.user.user_id]
        );

        if (userProfile.rows.length > 0) {
          const userName = encodeURIComponent(userProfile.rows[0].full_name); // Encode for URL safety
          return res.redirect(`/profiles/${userName}`);
        } else {
          return res.status(404).json({ error: "User not found" });
        }
      } catch (err) {
        return res.status(500).json({ error: "Server error" });
      }
    }
    next();
  },
  getAllProfiles
);

module.exports = router;
