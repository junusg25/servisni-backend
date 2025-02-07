const express = require("express");
const {
  getClients,
  getClientById,
  addClient,
  updateClient,
  deleteClient,
} = require("../controllers/clientController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Routes (Authentication Required for All)
router.get("/", authenticateToken, getClients); // Get all clients
router.get("/:id", authenticateToken, getClientById); // Get a specific client by ID
router.post("/", authenticateToken, addClient); // Add new client
router.put("/:id", authenticateToken, updateClient); // Update client
router.delete("/:id", authenticateToken, deleteClient); // Delete client

module.exports = router;
