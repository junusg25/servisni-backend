const express = require("express");
const {
  getRepairs,
  getRepairById,
  addRepair,
  updateRepair,
  deleteRepair,
  getRepairsForMachine,
} = require("../controllers/repairController");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Ensure all functions are correctly mapped to routes
router.get("/", authenticateToken, getRepairs);
router.get("/:id", authenticateToken, getRepairById);
router.post("/", authenticateToken, addRepair);
router.put("/:id", authenticateToken, updateRepair);
router.delete("/:id", authenticateToken, deleteRepair);
router.get(
  "/for-machine/:machine_id/client/:client_id",
  authenticateToken,
  getRepairsForMachine
);

module.exports = router;
