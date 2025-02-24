const pool = require("../db");
const logger = require("../logger"); // Import Winston Logger

// ✅ Get all machines (including serial numbers & client assignments)
const getMachines = async (req, res) => {
  try {
    let { page, limit, search, sort } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    let query = `
SELECT m.id, 
       m.model_name, 
       m.catalog_number, 
       TO_CHAR(m.date_of_adding, 'DD.MM.YYYY - FMDay') AS date_of_adding, -- ✅ Format date
       m.notes, 
       m.url,
       COALESCE(json_agg(json_build_object('serial', s.serial, 'client_id', s.client_id)) 
       FILTER (WHERE s.serial IS NOT NULL), '[]') AS serials
FROM machines m
LEFT JOIN serial_numbers s ON m.id = s.machine_id`;

    let params = [];
    let conditions = [];

    if (search) {
      conditions.push(
        "(m.model_name ILIKE $" +
          (params.length + 1) +
          " OR m.catalog_number ILIKE $" +
          (params.length + 1) +
          ")"
      );
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " GROUP BY m.id";

    const validSortFields = ["model_name", "catalog_number", "date_of_adding"];
    if (sort && validSortFields.includes(sort)) {
      query += ` ORDER BY ${sort} ASC`;
    } else {
      query += " ORDER BY m.id ASC";
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
    logger.error(`❌ Error fetching machines: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get a single machine by ID with serial numbers & client info
const getMachineById = async (req, res) => {
  try {
    const { id } = req.params;

    const machine = await pool.query(
      `SELECT m.*, 
              COALESCE(json_agg(
                  json_build_object(
                      'id', s.id,  -- ✅ Ensure Serial ID is included
                      'serial', s.serial, 
                      'client_id', c.id, 
                      'client_name', c.name,
                      'date_of_sale', s.date_of_sale
                  ) ORDER BY s.id
              ) FILTER (WHERE s.id IS NOT NULL), '[]') AS serials
       FROM machines m
       LEFT JOIN serial_numbers s ON m.id = s.machine_id
       LEFT JOIN clients c ON s.client_id = c.id
       WHERE m.id = $1
       GROUP BY m.id`,
      [id]
    );

    if (machine.rows.length === 0) {
      return res.status(404).json({ error: "Machine not found" });
    }

    res.status(200).json(machine.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

const addMachine = async (req, res) => {
  try {
    console.log("🔹 Received Machine Data:", req.body); // ✅ Debugging
    const { model_name, catalog_number, date_of_adding, notes, url } = req.body;

    if (!model_name || !catalog_number) {
      return res
        .status(400)
        .json({ error: "Model Name and Catalog Number are required." });
    }

    const newMachine = await pool.query(
      "INSERT INTO machines (model_name, catalog_number, date_of_adding, notes, url) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [
        model_name,
        catalog_number,
        date_of_adding || null,
        notes || null,
        url || null,
      ]
    );

    logger.info(
      `✅ Machine Added - Model: ${model_name}, Catalog Number: ${catalog_number}`
    );
    res
      .status(201)
      .json({ message: "Machine added", machine: newMachine.rows[0] });
  } catch (err) {
    console.error("❌ Error Adding Machine:", err.message); // ✅ Debugging
    logger.error(`❌ Error adding machine: ${err.message}`);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// ✅ Update a machine
const updateMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const { model_name, catalog_number, date_of_adding, notes, url } = req.body;

    const result = await pool.query(
      "UPDATE machines SET model_name = $1, catalog_number = $2, date_of_adding = $3, notes = $4, url = $5 WHERE id = $6 RETURNING *",
      [model_name, catalog_number, date_of_adding, notes, url, id]
    );

    if (result.rows.length === 0) {
      logger.warn(`Machine Not Found for Update - ID: ${id}`);
      return res.status(404).json({ error: "Machine not found" });
    }

    logger.info(`Machine Updated - ID: ${id}`);
    res
      .status(200)
      .json({ message: "Machine updated", machine: result.rows[0] });
  } catch (err) {
    logger.error(`❌ Error updating machine: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Delete a machine
const deleteMachine = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM machines WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      logger.warn(`Machine Not Found for Deletion - ID: ${id}`);
      return res.status(404).json({ error: "Machine not found" });
    }

    logger.info(`Machine Deleted - ID: ${id}`);
    res.status(200).json({ message: "Machine deleted successfully" });
  } catch (err) {
    logger.error(`❌ Error deleting machine: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get machines with serial numbers assigned to a specific client
const getMachinesForClient = async (req, res) => {
  const client_id = req.params.client_id || req.query.client_id;

  console.log("🔍 Fetching machines for client:", client_id);

  if (!client_id) {
    return res.status(400).json({ error: "Client ID is required" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT 
          m.id AS machine_id, 
          m.model_name, 
          m.catalog_number, 
          s.serial AS serial_number,
          COALESCE(TO_CHAR(s.date_of_sale, 'DD.MM.YYYY - FMDay'), 'No Sale Date') AS date_of_sale  
       FROM machines m
       JOIN serial_numbers s ON m.id = s.machine_id  -- ✅ Ensure only assigned machines
       WHERE s.client_id = $1;`,
      [client_id]
    );

    console.log("✅ Machines Data Fetched:", rows); // ✅ Debugging Log

    res.status(200).json({ data: rows });
  } catch (error) {
    console.error("❌ SQL Error fetching machines:", error.message);
    res.status(500).json({ error: "Database error fetching machines" });
  }
};

//Get serial numbers for a specific machine
const getSerialNumbersForMachine = async (req, res) => {
  const { client_id, machine_id } = req.params;

  if (!client_id || !machine_id) {
    return res
      .status(400)
      .json({ error: "Client ID and Machine ID are required" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT s.id AS serial_id, s.serial 
       FROM serial_numbers s
       WHERE s.client_id = $1 AND s.machine_id = $2
       ORDER BY s.serial;`, //✅ Ensures all serials are returned in order
      [client_id, machine_id]
    );

    console.log(
      `✅ Found ${rows.length} serials for machine ${machine_id}:`,
      rows
    ); // ✅ Debugging
    res.json({ data: rows });
  } catch (error) {
    console.error("❌ Error fetching serial numbers:", error);
    res.status(500).json({ error: "Failed to fetch serial numbers" });
  }
};

module.exports = {
  getMachines,
  getMachineById,
  addMachine,
  updateMachine,
  deleteMachine,
  getMachinesForClient,
  getSerialNumbersForMachine, // ✅ Add this to exports
};
