const express = require("express");
const {
  getRepairs,
  getRepairById,
  addRepair,
  updateRepair,
  deleteRepair,
} = require("../controllers/repairController");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRole = require("../middleware/roleMiddleware");

const router = express.Router();

// Routes (Admin, Seller, Repairman Only)
router.get(
  "/",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  getRepairs
);
router.get(
  "/:id",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  getRepairById
);
router.post(
  "/",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  addRepair
);
router.put(
  "/:id",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  updateRepair
);
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  deleteRepair
);

module.exports = router;
