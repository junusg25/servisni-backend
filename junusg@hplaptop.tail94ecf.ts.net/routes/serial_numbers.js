const express = require("express");
const {
  assignSerialNumber,
  getSerialNumbers,
  getMachinesForClient,
  deleteSerialNumber,
} = require("../controllers/serialNumbersController");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRole = require("../middleware/roleMiddleware");

const router = express.Router();

// Assign Serial Number to a Client (Bind Machine to Client)
router.post(
  "/assign",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  assignSerialNumber
);

// Get Serial Numbers for a Specific Machine
router.get(
  "/",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  getSerialNumbers
);

// Get Machines Assigned to a Client
router.get(
  "/client",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  getMachinesForClient
);

// Delete a Serial Number (Unassign Machine from Client)
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  deleteSerialNumber
);

module.exports = router;
