const pool = require("../db");
const logger = require("../logger"); // Import Winston Logger

// Get all repairs (with filtering, sorting, and pagination)
const getRepairs = async (req, res) => {
  try {
    let { page, limit, search, sort } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    let query = `SELECT r.id, c.name AS client_name, p.full_name AS repaired_by, r.repair_date, 
                 r.description, r.parts_used, m.model_name AS repaired_machine
                 FROM repairs r
                 JOIN clients c ON r.client_id = c.id
                 JOIN profiles p ON r.repaired_by = p.user_id
                 JOIN machines m ON r.repaired_machine = m.id`;
    let params = [];
    let conditions = [];

    if (search) {
      conditions.push(
        "(c.name ILIKE $" +
          (params.length + 1) +
          " OR m.model_name ILIKE $" +
          (params.length + 1) +
          ")"
      );
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const validSortFields = [
      "client_name",
      "repaired_by",
      "repair_date",
      "parts_used",
      "repaired_machine",
    ];
    if (sort && validSortFields.includes(sort)) {
      query += ` ORDER BY ${sort} ASC`;
    } else {
      query += " ORDER BY r.id ASC";
    }

    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const repairs = await pool.query(query, params);
    const totalRepairs = await pool.query("SELECT COUNT(*) FROM repairs");

    res.status(200).json({
      total: parseInt(totalRepairs.rows[0].count),
      page,
      limit,
      data: repairs.rows,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Get a single repair by ID
const getRepairById = async (req, res) => {
  try {
    const { id } = req.params;
    const repair = await pool.query(
      `SELECT r.id, c.name AS client_name, p.full_name AS repaired_by, r.repair_date, 
              r.description, r.parts_used, m.model_name AS repaired_machine
       FROM repairs r
       JOIN clients c ON r.client_id = c.id
       JOIN profiles p ON r.repaired_by = p.user_id
       JOIN machines m ON r.repaired_machine = m.id
       WHERE r.id = $1`,
      [id]
    );

    if (repair.rows.length === 0) {
      logger.warn(`Repair Not Found - ID: ${id}`);
      return res.status(404).json({ error: "Repair not found" });
    }

    logger.info(`Repair Retrieved - ID: ${id}`);
    res.status(200).json(repair.rows[0]);
  } catch (err) {
    logger.error(`❌ Error fetching repair: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Add a repair (Ensuring Foreign Keys Exist)
const addRepair = async (req, res) => {
  try {
    const {
      client_id,
      repaired_by,
      repair_date,
      description,
      parts_used,
      repaired_machine,
    } = req.body;

    // Validate that client, repairman, and machine exist
    const clientExists = await pool.query(
      "SELECT id FROM clients WHERE id = $1",
      [client_id]
    );
    if (clientExists.rows.length === 0) {
      logger.warn(`Repair Add Failed - Client Not Found: ${client_id}`);
      return res.status(400).json({ error: "Client does not exist" });
    }

    const repairmanExists = await pool.query(
      "SELECT user_id FROM profiles WHERE user_id = $1",
      [repaired_by]
    );
    if (repairmanExists.rows.length === 0) {
      logger.warn(`Repair Add Failed - Repairman Not Found: ${repaired_by}`);
      return res.status(400).json({ error: "Repairman does not exist" });
    }

    const machineExists = await pool.query(
      "SELECT id FROM machines WHERE id = $1",
      [repaired_machine]
    );
    if (machineExists.rows.length === 0) {
      logger.warn(`Repair Add Failed - Machine Not Found: ${repaired_machine}`);
      return res.status(400).json({ error: "Machine does not exist" });
    }

    const newRepair = await pool.query(
      "INSERT INTO repairs (client_id, repaired_by, repair_date, description, parts_used, repaired_machine) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [
        client_id,
        repaired_by,
        repair_date,
        description,
        parts_used,
        repaired_machine,
      ]
    );

    logger.info(
      `Repair Added - ID: ${
        newRepair.rows[0].id
      }, Client: ${client_id}, Machine: ${repaired_machine}, Added By: ${
        req.user ? req.user.email : "Unknown"
      }`
    );

    res.status(201).json({
      message: "Repair added successfully!",
      repair: newRepair.rows[0],
    });
  } catch (err) {
    logger.error(`❌ Error adding repair: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Update a repair
const updateRepair = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      client_id,
      repaired_by,
      repair_date,
      description,
      parts_used,
      repaired_machine,
    } = req.body;

    // Check if repair exists
    const existingRepair = await pool.query(
      "SELECT * FROM repairs WHERE id = $1",
      [id]
    );
    if (existingRepair.rows.length === 0) {
      logger.warn(`Repair Not Found for Update - ID: ${id}`);
      return res.status(404).json({ error: "Repair not found" });
    }

    const result = await pool.query(
      "UPDATE repairs SET client_id = $1, repaired_by = $2, repair_date = $3, description = $4, parts_used = $5, repaired_machine = $6 WHERE id = $7 RETURNING *",
      [
        client_id,
        repaired_by,
        repair_date,
        description,
        parts_used,
        repaired_machine,
        id,
      ]
    );

    logger.info(
      `Repair Updated - ID: ${id}, Updated By: ${
        req.user ? req.user.email : "Unknown"
      }`
    );

    res.status(200).json({
      message: "Repair updated successfully!",
      repair: result.rows[0],
    });
  } catch (err) {
    logger.error(`❌ Error updating repair: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete a repair
const deleteRepair = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM repairs WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      logger.warn(`Repair Not Found for Deletion - ID: ${id}`);
      return res.status(404).json({ error: "Repair not found" });
    }

    logger.info(
      `Repair Deleted - ID: ${id}, Deleted By: ${
        req.user ? req.user.email : "Unknown"
      }`
    );

    res.status(200).json({ message: "Repair deleted successfully!" });
  } catch (err) {
    logger.error(`❌ Error deleting repair: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getRepairs,
  getRepairById,
  addRepair,
  updateRepair,
  deleteRepair,
};
