const logger = require("../logger");

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    logger.warn(
      `Unauthorized Admin Access Attempt - User ID: ${
        req.user ? req.user.user_id : "Guest"
      }`
    );
    return res.status(403).json({ error: "Access denied. Admins only." });
  }
  next();
};

module.exports = isAdmin;
