const express = require("express");
const clientsRoutes = require("../routes/clients");
const machinesRoutes = require("../routes/machines");
const {
  addAdmission,
  getAdmissions,
  getAdmissionById,
} = require("../controllers/admissionController");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Add new admission (Receptionist only)
router.post("/", authenticateToken, addAdmission);

// ✅ Get all admissions
router.get("/", authenticateToken, getAdmissions);

// ✅ Get a specific admission by ID
router.get("/:id", authenticateToken, getAdmissionById);

router.use("/clients", authenticateToken, clientsRoutes);
router.use("/machines", authenticateToken, machinesRoutes);

module.exports = router;
