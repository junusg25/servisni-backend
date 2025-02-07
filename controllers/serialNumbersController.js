const pool = require("../db");
const logger = require("../logger"); // Import Winston Logger

// Assign Serial Number to Client (Binding Machine to Client)
const assignSerialNumber = async (req, res) => {
  try {
    const { client_id, machine_id, serial } = req.body;

    if (!client_id || !machine_id || !serial) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if machine exists
    const machineExists = await pool.query(
      "SELECT id FROM machines WHERE id = $1",
      [machine_id]
    );
    if (machineExists.rows.length === 0) {
      return res.status(400).json({ error: "Machine does not exist" });
    }

    // Check if client exists
    const clientExists = await pool.query(
      "SELECT id FROM clients WHERE id = $1",
      [client_id]
    );
    if (clientExists.rows.length === 0) {
      return res.status(400).json({ error: "Client does not exist" });
    }

    // Ensure unique serial number
    const serialExists = await pool.query(
      "SELECT id FROM serial_numbers WHERE serial = $1",
      [serial]
    );
    if (serialExists.rows.length > 0) {
      return res.status(400).json({ error: "Serial number already exists" });
    }

    // Assign machine with serial number to client
    const newSerial = await pool.query(
      "INSERT INTO serial_numbers (machine_id, serial, client_id) VALUES ($1, $2, $3) RETURNING *",
      [machine_id, serial, client_id]
    );

    logger.info(
      `Machine Assigned - Serial: ${serial}, Machine ID: ${machine_id}, Client ID: ${client_id}`
    );

    res.status(201).json({
      message: "Machine assigned successfully!",
      serialNumber: newSerial.rows[0],
    });
  } catch (err) {
    logger.error(`❌ Error assigning serial number: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Get serial numbers for a specific machine
const getSerialNumbers = async (req, res) => {
  try {
    const { machine_id } = req.query;
    if (!machine_id) {
      logger.warn("Machine ID is required for fetching serial numbers.");
      return res.status(400).json({ error: "Machine ID is required" });
    }

    const serialNumbers = await pool.query(
      "SELECT * FROM serial_numbers WHERE machine_id = $1",
      [machine_id]
    );

    logger.info(`Serial Numbers Retrieved - Machine ID: ${machine_id}`);
    res.status(200).json(serialNumbers.rows);
  } catch (err) {
    logger.error(`❌ Error fetching serial numbers: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all machines assigned to a client
const getMachinesForClient = async (req, res) => {
  try {
    const { client_id } = req.query;
    if (!client_id) {
      logger.warn("Client ID is required for fetching assigned machines.");
      return res.status(400).json({ error: "Client ID is required" });
    }

    const machines = await pool.query(
      `SELECT m.id, m.model_name, m.catalog_number, m.date_of_sale, s.serial 
       FROM serial_numbers s
       JOIN machines m ON s.machine_id = m.id
       WHERE s.client_id = $1`,
      [client_id]
    );

    logger.info(`Machines Retrieved - Client ID: ${client_id}`);
    res.status(200).json(machines.rows);
  } catch (err) {
    logger.error(`❌ Error fetching client machines: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Remove a serial number
const deleteSerialNumber = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if serial_number exists
    const existingSerial = await pool.query(
      "SELECT * FROM serial_numbers WHERE id = $1",
      [id]
    );
    if (existingSerial.rows.length === 0) {
      logger.warn(`Serial Number Not Found for Deletion - ID: ${id}`);
      return res.status(404).json({ error: "Serial number not found" });
    }

    await pool.query("DELETE FROM serial_numbers WHERE id = $1", [id]);

    logger.info(`Serial Number Deleted - ID: ${id}`);
    res.status(200).json({ message: "Serial number deleted" });
  } catch (err) {
    logger.error(`❌ Error deleting serial number: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  assignSerialNumber,
  getSerialNumbers,
  getMachinesForClient,
  deleteSerialNumber,
};
