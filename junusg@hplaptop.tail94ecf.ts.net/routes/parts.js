const express = require("express");
const {
  getParts,
  getPartById,
  addPart,
  updatePart,
  deletePart,
} = require("../controllers/partController");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRole = require("../middleware/roleMiddleware");

const router = express.Router();

// Routes (Admin, Seller, Repairman Only)
router.get(
  "/",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  getParts
);
router.get(
  "/:id",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  getPartById
);
router.post(
  "/",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  addPart
);
router.put(
  "/:id",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  updatePart
);
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  deletePart
);

module.exports = router;
