const express = require("express");
const {
  getRepairParts,
  addRepairPart,
  deleteRepairPart,
} = require("../controllers/repairPartsController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Routes (Authentication Required for All)
router.get("/", authenticateToken, getRepairParts); // Get all repair parts
router.post("/", authenticateToken, addRepairPart); // Add new repair part
router.delete("/:id", authenticateToken, deleteRepairPart); // Delete repair part

module.exports = router;
