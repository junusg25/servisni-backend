const express = require("express");
const {
  assignSerialNumber,
  getSerialNumbers,
  getMachinesForClient,
  deleteSerialNumber,
} = require("../controllers/serialNumbersController");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Assign Serial Number to a Client (Bind Machine to Client)
router.post("/assign", authenticateToken, assignSerialNumber);

// Get Serial Numbers for a Specific Machine
router.get("/", authenticateToken, getSerialNumbers);

// Get Machines Assigned to a Client
router.get("/client", authenticateToken, getMachinesForClient);

// Delete a Serial Number (Unassign Machine from Client)
router.delete("/:id", authenticateToken, deleteSerialNumber);

module.exports = router;
