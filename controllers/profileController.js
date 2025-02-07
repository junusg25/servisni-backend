const pool = require("../db");
const logger = require("../logger"); // Import Winston Logger

// Get the profile of the authenticated user
const getMyProfile = async (req, res) => {
  try {
    const user = await pool.query(
      "SELECT user_id, full_name, email, phone FROM profiles WHERE user_id = $1",
      [req.user.user_id]
    );

    if (user.rows.length === 0) {
      logger.warn(`Profile Not Found - User ID: ${req.user.user_id}`);
      return res.status(404).json({ error: "User not found" });
    }

    logger.info(`Profile Retrieved - User ID: ${req.user.user_id}`);
    res.status(200).json(user.rows[0]);
  } catch (err) {
    logger.error(`❌ Error fetching profile: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Update profile details
const updateMyProfile = async (req, res) => {
  try {
    const { full_name, phone } = req.body;

    if (!full_name || !phone) {
      logger.warn(
        `Profile Update Failed - Missing Fields - User ID: ${req.user.user_id}`
      );
      return res
        .status(400)
        .json({ error: "Full name and phone are required" });
    }

    await pool.query(
      "UPDATE profiles SET full_name = $1, phone = $2 WHERE user_id = $3",
      [full_name, phone, req.user.user_id]
    );

    logger.info(`Profile Updated - User ID: ${req.user.user_id}`);
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (err) {
    logger.error(`❌ Error updating profile: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all profiles (Admins only, Redirect non-admins)
const getAllProfiles = async (req, res) => {
  try {
    // If user is not an admin, redirect them to their own profile
    if (req.user.role !== "admin") {
      logger.warn(
        `Unauthorized Access Attempt to All Profiles - User ID: ${req.user.user_id}`
      );
      return res.redirect("/profiles/me");
    }

    // Admin: Fetch all profiles
    const users = await pool.query(
      "SELECT user_id, full_name, email, phone FROM profiles"
    );

    logger.info(
      `Admin Access - Retrieved All Profiles - Admin: ${req.user.email}`
    );
    res.status(200).json(users.rows);
  } catch (err) {
    logger.error(`❌ Error fetching all profiles: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getMyProfile, updateMyProfile, getAllProfiles };
