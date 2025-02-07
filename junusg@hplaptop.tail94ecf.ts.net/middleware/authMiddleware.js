const jwt = require("jsonwebtoken");
require("dotenv").config();
const pool = require("../db");

const authenticateToken = async (req, res, next) => {
  const token = req.cookies.token || req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;

    // Fetch role from database
    const roleQuery = await pool.query(
      `SELECT r.role_name FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1`,
      [req.user.user_id]
    );

    req.user.role = roleQuery.rows.length
      ? roleQuery.rows[0].role_name
      : "user"; // Default to "user"

    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
};

module.exports = authenticateToken;
