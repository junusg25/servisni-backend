const express = require("express");
const {
  getClients,
  addClient,
  updateClient,
  deleteClient,
} = require("../controllers/clientController");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// CRUD operations for clients
router.get("/", authenticateToken, getClients); // Get all clients
router.post("/", authenticateToken, addClient); // Add a new client
router.put("/:id", authenticateToken, updateClient); // Update a client
router.delete("/:id", authenticateToken, deleteClient); // Delete a client

module.exports = router;
