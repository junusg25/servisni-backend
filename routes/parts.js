const express = require("express");
const {
  getParts,
  getPartById,
  addPart,
  updatePart,
  deletePart,
  getRepairsForPart,
} = require("../controllers/partController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Routes (Authentication Required for All)
router.get("/", authenticateToken, getParts); // Get all parts
router.get("/:id", authenticateToken, getPartById); // Get a specific part by ID
router.post("/", authenticateToken, addPart); // Add new part
router.put("/:id", authenticateToken, updatePart); // Update part
router.delete("/:id", authenticateToken, deletePart); // Delete part
router.get("/:partId/repairs", authenticateToken, getRepairsForPart);

module.exports = router;
