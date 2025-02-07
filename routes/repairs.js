const express = require("express");
const {
  getRepairs,
  getRepairById,
  addRepair,
  updateRepair,
  deleteRepair,
} = require("../controllers/repairController");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Ensure all functions are correctly mapped to routes
router.get("/", authenticateToken, getRepairs);
router.get("/:id", authenticateToken, getRepairById);
router.post("/", authenticateToken, addRepair);
router.put("/:id", authenticateToken, updateRepair);
router.delete("/:id", authenticateToken, deleteRepair);

module.exports = router;
