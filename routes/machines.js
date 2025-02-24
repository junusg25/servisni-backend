const express = require("express");
const {
  getMachines,
  getMachineById,
  addMachine,
  updateMachine,
  deleteMachine,
  getMachinesForClient,
  getSerialNumbersForMachine, // ✅ Ensure this is included
} = require("../controllers/machineController"); // ✅ Correct import

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Routes
router.get("/", authenticateToken, getMachines);
router.get("/:id", authenticateToken, getMachineById);
router.post("/", authenticateToken, addMachine);
router.put("/:id", authenticateToken, updateMachine);
router.delete("/:id", authenticateToken, deleteMachine);
router.get("/for-client/:client_id", authenticateToken, getMachinesForClient);
router.get(
  "/serials/:client_id/:machine_id",
  authenticateToken,
  getSerialNumbersForMachine
); // ✅ Fix Route

module.exports = router;
