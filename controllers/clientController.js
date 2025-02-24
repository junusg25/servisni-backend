const pool = require("../db");
const logger = require("../logger"); // Import Winston Logger

// Get all clients (with filtering, sorting, and pagination)
const getClients = async (req, res) => {
  try {
    let { page, limit, search, sort } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id, 
        name, 
        email, 
        COALESCE(phone, '') AS phone, 
        COALESCE(address, '') AS address, 
        COALESCE(city, '') AS city, 
        COALESCE(country, '') AS country, 
        COALESCE(notes, '') AS notes
      FROM clients
    `;

    let params = [];
    let conditions = [];

    if (search) {
      conditions.push(
        "(name ILIKE $" +
          (params.length + 1) +
          " OR email ILIKE $" +
          (params.length + 1) +
          ")"
      );
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const validSortFields = ["name", "email", "city"];
    if (sort && validSortFields.includes(sort)) {
      query += ` ORDER BY ${sort} ASC`;
    } else {
      query += " ORDER BY id ASC";
    }

    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const clients = await pool.query(query, params);
    const totalClients = await pool.query("SELECT COUNT(*) FROM clients");

    res.status(200).json({
      total: parseInt(totalClients.rows[0].count),
      page,
      limit,
      data: clients.rows,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Get a single client by ID
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        id, 
        name, 
        email, 
        COALESCE(phone, '') AS phone, 
        COALESCE(address, '') AS address, 
        COALESCE(city, '') AS city, 
        COALESCE(country, '') AS country, 
        COALESCE(notes, '') AS notes
      FROM clients WHERE id = $1
    `;

    const client = await pool.query(query, [id]);

    if (client.rows.length === 0) {
      logger.warn(`Client Not Found - ID: ${id}`);
      return res.status(404).json({ error: "Client not found" });
    }

    logger.info(`Client Retrieved - ID: ${id}`);
    res.status(200).json({ data: client.rows[0] });
  } catch (err) {
    logger.error(`❌ Error fetching client: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Add a new client
const addClient = async (req, res) => {
  try {
    const { name, email, phone, address, city, country, notes } = req.body;

    // Check if email already exists
    const existingClient = await pool.query(
      "SELECT * FROM clients WHERE email = $1",
      [email]
    );
    if (existingClient.rows.length > 0) {
      logger.warn(
        `Client Registration Failed - Email Already Exists: ${email}`
      );
      return res
        .status(400)
        .json({ error: "Client with this email already exists" });
    }

    const newClient = await pool.query(
      "INSERT INTO clients (name, email, phone, address, city, country, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [name, email, phone, address, city, country, notes]
    );

    logger.info(
      `Client Added - Name: ${name}, Email: ${email}, Added By: ${
        req.user ? req.user.email : "Unknown"
      }`
    );

    res
      .status(201)
      .json({ message: "Client added", client: newClient.rows[0] });
  } catch (err) {
    logger.error(`❌ Error adding client: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Update a client
const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, city, country, notes } = req.body;

    // Check if client exists
    const existingClient = await pool.query(
      "SELECT * FROM clients WHERE id = $1",
      [id]
    );
    if (existingClient.rows.length === 0) {
      logger.warn(`Client Not Found for Update - ID: ${id}`);
      return res.status(404).json({ error: "Client not found" });
    }

    const updatedClient = await pool.query(
      `UPDATE clients 
      SET name = COALESCE($1, name), 
          email = COALESCE($2, email), 
          phone = COALESCE($3, phone), 
          address = COALESCE($4, address), 
          city = COALESCE($5, city), 
          country = COALESCE($6, country), 
          notes = COALESCE($7, notes) 
      WHERE id = $8 RETURNING *`,
      [
        name || existingClient.rows[0].name,
        email || existingClient.rows[0].email,
        phone || existingClient.rows[0].phone,
        address || existingClient.rows[0].address,
        city || existingClient.rows[0].city,
        country || existingClient.rows[0].country,
        notes || existingClient.rows[0].notes,
        id,
      ]
    );

    logger.info(
      `Client Updated - ID: ${id}, Updated By: ${
        req.user ? req.user.email : "Unknown"
      }`
    );
    res
      .status(200)
      .json({ message: "Client updated", client: updatedClient.rows[0] });
  } catch (err) {
    logger.error(`❌ Error updating client: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete a client
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const existingClient = await pool.query(
      "SELECT * FROM clients WHERE id = $1",
      [id]
    );
    if (existingClient.rows.length === 0) {
      logger.warn(`Client Not Found for Deletion - ID: ${id}`);
      return res.status(404).json({ error: "Client not found" });
    }

    await pool.query("DELETE FROM clients WHERE id = $1", [id]);

    logger.info(
      `Client Deleted - ID: ${id}, Deleted By: ${
        req.user ? req.user.email : "Unknown"
      }`
    );

    res.status(200).json({ message: "Client deleted successfully" });
  } catch (err) {
    logger.error(`❌ Error deleting client: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getClients,
  getClientById,
  addClient,
  updateClient,
  deleteClient,
};
