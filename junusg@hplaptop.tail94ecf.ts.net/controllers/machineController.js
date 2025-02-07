const pool = require("../db");
const logger = require("../logger"); // Import Winston Logger

// Get all machines (with filtering, sorting, and pagination)
const getMachines = async (req, res) => {
  try {
    let { page, limit, search, sort } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM machines";
    let params = [];
    let conditions = [];

    if (search) {
      conditions.push(
        "(model_name ILIKE $" +
          (params.length + 1) +
          " OR catalog_number ILIKE $" +
          (params.length + 1) +
          ")"
      );
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const validSortFields = ["model_name", "catalog_number", "date_of_sale"];
    if (sort && validSortFields.includes(sort)) {
      query += ` ORDER BY ${sort} ASC`;
    } else {
      query += " ORDER BY id ASC";
    }

    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const machines = await pool.query(query, params);
    const totalMachines = await pool.query("SELECT COUNT(*) FROM machines");

    res.status(200).json({
      total: parseInt(totalMachines.rows[0].count),
      page,
      limit,
      data: machines.rows,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Get a single machine by ID
const getMachineById = async (req, res) => {
  try {
    const { id } = req.params;
    const machine = await pool.query("SELECT * FROM machines WHERE id = $1", [
      id,
    ]);

    if (machine.rows.length === 0) {
      logger.warn(`Machine Not Found - ID: ${id}`);
      return res.status(404).json({ error: "Machine not found" });
    }

    logger.info(`Machine Retrieved - ID: ${id}`);
    res.status(200).json(machine.rows[0]);
  } catch (err) {
    logger.error(`❌ Error fetching machine: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Add a new machine
const addMachine = async (req, res) => {
  try {
    const { model_name, catalog_number, date_of_sale, notes, url } = req.body;

    // Check if catalog number already exists
    const existingMachine = await pool.query(
      "SELECT * FROM machines WHERE catalog_number = $1",
      [catalog_number]
    );
    if (existingMachine.rows.length > 0) {
      logger.warn(
        `Machine Registration Failed - Catalog Number Exists: ${catalog_number}`
      );
      return res
        .status(400)
        .json({ error: "Machine with this catalog number already exists" });
    }

    const newMachine = await pool.query(
      "INSERT INTO machines (model_name, catalog_number, date_of_sale, notes, url) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [model_name, catalog_number, date_of_sale, notes, url]
    );

    logger.info(
      `Machine Added - Model: ${model_name}, Catalog Number: ${catalog_number}, Added By: ${
        req.user ? req.user.email : "Unknown"
      }`
    );

    res
      .status(201)
      .json({ message: "Machine added", machine: newMachine.rows[0] });
  } catch (err) {
    logger.error(`❌ Error adding machine: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Update a machine
const updateMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const { model_name, catalog_number, date_of_sale, notes, url } = req.body;

    // Check if machine exists
    const existingMachine = await pool.query(
      "SELECT * FROM machines WHERE id = $1",
      [id]
    );
    if (existingMachine.rows.length === 0) {
      logger.warn(`Machine Not Found for Update - ID: ${id}`);
      return res.status(404).json({ error: "Machine not found" });
    }

    const updatedMachine = await pool.query(
      "UPDATE machines SET model_name = $1, catalog_number = $2, date_of_sale = $3, notes = $4, url = $5 WHERE id = $6 RETURNING *",
      [model_name, catalog_number, date_of_sale, notes, url, id]
    );

    logger.info(
      `Machine Updated - ID: ${id}, Updated By: ${
        req.user ? req.user.email : "Unknown"
      }`
    );

    res
      .status(200)
      .json({ message: "Machine updated", machine: updatedMachine.rows[0] });
  } catch (err) {
    logger.error(`❌ Error updating machine: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete a machine
const deleteMachine = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if machine exists
    const existingMachine = await pool.query(
      "SELECT * FROM machines WHERE id = $1",
      [id]
    );
    if (existingMachine.rows.length === 0) {
      logger.warn(`Machine Not Found for Deletion - ID: ${id}`);
      return res.status(404).json({ error: "Machine not found" });
    }

    await pool.query("DELETE FROM machines WHERE id = $1", [id]);

    logger.info(
      `Machine Deleted - ID: ${id}, Deleted By: ${
        req.user ? req.user.email : "Unknown"
      }`
    );

    res.status(200).json({ message: "Machine deleted successfully" });
  } catch (err) {
    logger.error(`❌ Error deleting machine: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getMachines,
  getMachineById,
  addMachine,
  updateMachine,
  deleteMachine,
};
