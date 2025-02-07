const express = require("express");
const {
  getMachines,
  getMachineById,
  addMachine,
  updateMachine,
  deleteMachine,
} = require("../controllers/machineController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Routes (Authentication Required for All)
router.get("/", authenticateToken, getMachines); // Get all machines
router.get("/:id", authenticateToken, getMachineById); // Get a specific machine by ID
router.post("/", authenticateToken, addMachine); // Add new machine
router.put("/:id", authenticateToken, updateMachine); // Update machine
router.delete("/:id", authenticateToken, deleteMachine); // Delete machine

module.exports = router;
