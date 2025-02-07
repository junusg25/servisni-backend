const pool = require("../db");
const logger = require("../logger"); // Import Winston Logger

// Get all parts (with filtering, sorting, and pagination)
const getParts = async (req, res) => {
  try {
    let { page, limit, search, sort } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM parts";
    let params = [];
    let conditions = [];

    if (search) {
      conditions.push(
        "(name ILIKE $" +
          (params.length + 1) +
          " OR description ILIKE $" +
          (params.length + 1) +
          ")"
      );
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const validSortFields = ["name", "description", "price"];
    if (sort && validSortFields.includes(sort)) {
      query += ` ORDER BY ${sort} ASC`;
    } else {
      query += " ORDER BY id ASC";
    }

    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const parts = await pool.query(query, params);
    const totalParts = await pool.query("SELECT COUNT(*) FROM parts");

    res.status(200).json({
      total: parseInt(totalParts.rows[0].count),
      page,
      limit,
      data: parts.rows,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Get a single part by ID
const getPartById = async (req, res) => {
  try {
    const { id } = req.params;
    const part = await pool.query("SELECT * FROM parts WHERE id = $1", [id]);

    if (part.rows.length === 0) {
      logger.warn(`Part Not Found - ID: ${id}`);
      return res.status(404).json({ error: "Part not found" });
    }

    logger.info(`Part Retrieved - ID: ${id}`);
    res.status(200).json(part.rows[0]);
  } catch (err) {
    logger.error(`❌ Error fetching part: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Add a new part
const addPart = async (req, res) => {
  try {
    const { name, description, price } = req.body;

    // Check if part already exists
    const existingPart = await pool.query(
      "SELECT * FROM parts WHERE name = $1",
      [name]
    );
    if (existingPart.rows.length > 0) {
      logger.warn(`Part Registration Failed - Name Exists: ${name}`);
      return res
        .status(400)
        .json({ error: "Part with this name already exists" });
    }

    const newPart = await pool.query(
      "INSERT INTO parts (name, description, price) VALUES ($1, $2, $3) RETURNING *",
      [name, description, price]
    );

    logger.info(
      `Part Added - Name: ${name}, Price: ${price}, Added By: ${
        req.user ? req.user.email : "Unknown"
      }`
    );

    res.status(201).json({ message: "Part added", part: newPart.rows[0] });
  } catch (err) {
    logger.error(`❌ Error adding part: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Update a part
const updatePart = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;

    // Check if part exists
    const existingPart = await pool.query("SELECT * FROM parts WHERE id = $1", [
      id,
    ]);
    if (existingPart.rows.length === 0) {
      logger.warn(`Part Not Found for Update - ID: ${id}`);
      return res.status(404).json({ error: "Part not found" });
    }

    const updatedPart = await pool.query(
      "UPDATE parts SET name = $1, description = $2, price = $3 WHERE id = $4 RETURNING *",
      [name, description, price, id]
    );

    logger.info(
      `Part Updated - ID: ${id}, Updated By: ${
        req.user ? req.user.email : "Unknown"
      }`
    );

    res
      .status(200)
      .json({ message: "Part updated", part: updatedPart.rows[0] });
  } catch (err) {
    logger.error(`❌ Error updating part: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete a part
const deletePart = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if part exists
    const existingPart = await pool.query("SELECT * FROM parts WHERE id = $1", [
      id,
    ]);
    if (existingPart.rows.length === 0) {
      logger.warn(`Part Not Found for Deletion - ID: ${id}`);
      return res.status(404).json({ error: "Part not found" });
    }

    await pool.query("DELETE FROM parts WHERE id = $1", [id]);

    logger.info(
      `Part Deleted - ID: ${id}, Deleted By: ${
        req.user ? req.user.email : "Unknown"
      }`
    );

    res.status(200).json({ message: "Part deleted successfully" });
  } catch (err) {
    logger.error(`❌ Error deleting part: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getParts, getPartById, addPart, updatePart, deletePart };
