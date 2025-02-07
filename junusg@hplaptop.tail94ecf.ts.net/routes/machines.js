const express = require("express");
const {
  getMachines,
  getMachineById,
  addMachine,
  updateMachine,
  deleteMachine,
} = require("../controllers/machineController");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRole = require("../middleware/roleMiddleware");

const router = express.Router();

// Routes (Admin, Seller, Repairman Only)
router.get(
  "/",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  getMachines
);
router.get(
  "/:id",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  getMachineById
);
router.post(
  "/",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  addMachine
);
router.put(
  "/:id",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  updateMachine
);
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole(["admin", "seller", "repairman"]),
  deleteMachine
);

module.exports = router;
