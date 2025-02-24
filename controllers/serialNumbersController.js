const pool = require("../db");
const logger = require("../logger"); // Import Winston Logger

// ✅ Assign Serial Number to Client (Binding Machine to Client)
const assignSerialNumber = async (req, res) => {
  try {
    const { client_id, machine_id, serial, date_of_sale } = req.body;

    if (!client_id || !machine_id || !serial || !date_of_sale) {
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

    // ✅ Assign machine with serial number to client and store date_of_sale
    const newSerial = await pool.query(
      "INSERT INTO serial_numbers (machine_id, serial, client_id, date_of_sale) VALUES ($1, $2, $3, $4) RETURNING *",
      [machine_id, serial, client_id, date_of_sale]
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

// ✅ Get serial numbers for a specific machine
const getSerialNumbers = async (req, res) => {
  try {
    const { machine_id } = req.query;
    if (!machine_id) {
      return res.status(400).json({ error: "Machine ID is required" });
    }

    const serialNumbers = await pool.query(
      `SELECT s.id, s.serial, s.client_id, s.date_of_sale, c.name AS client_name 
       FROM serial_numbers s
       LEFT JOIN clients c ON s.client_id = c.id
       WHERE s.machine_id = $1`,
      [machine_id]
    );

    res.status(200).json({ data: serialNumbers.rows }); // ✅ Ensure data is returned properly
  } catch (err) {
    console.error(`❌ Error fetching serial numbers: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get all machines assigned to a client
const getMachinesForClient = async (req, res) => {
  try {
    const { client_id } = req.query;
    if (!client_id) {
      return res.status(400).json({ error: "Client ID is required" });
    }

    const machines = await pool.query(
      `SELECT m.id, m.model_name, m.catalog_number, s.serial, s.date_of_sale 
       FROM serial_numbers s
       JOIN machines m ON s.machine_id = m.id
       WHERE s.client_id = $1`,
      [client_id]
    );

    logger.info(`Machines Retrieved - Client ID: ${client_id}`);
    res.status(200).json({ data: machines.rows });
  } catch (err) {
    logger.error(`❌ Error fetching client machines: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Remove a serial number
const deleteSerialNumber = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if serial_number exists
    const existingSerial = await pool.query(
      "SELECT * FROM serial_numbers WHERE id = $1",
      [id]
    );
    if (existingSerial.rows.length === 0) {
      return res.status(404).json({ error: "Serial number not found" });
    }

    await pool.query("DELETE FROM serial_numbers WHERE id = $1", [id]);

    logger.info(`Serial Number Deleted - ID: ${id}`);
    res.status(200).json({ message: "Serial number deleted successfully" });
  } catch (err) {
    logger.error(`❌ Error deleting serial number: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

const getSerialNumbersForMachine = async (req, res) => {
  const { client_id, machine_id } = req.params;

  if (!client_id || !machine_id) {
    return res
      .status(400)
      .json({ error: "Client ID and Machine ID are required" });
  }

  try {
    const serials = await pool.query(
      `SELECT id AS serial_id, serial 
       FROM serial_numbers 
       WHERE client_id = $1 AND machine_id = $2 
       ORDER BY serial;`,
      [client_id, machine_id]
    );

    res.json({ data: serials.rows });
  } catch (error) {
    console.error("❌ Error fetching serial numbers:", error);
    res.status(500).json({ error: "Failed to fetch serial numbers" });
  }
};

module.exports = {
  assignSerialNumber,
  getSerialNumbers,
  getMachinesForClient,
  deleteSerialNumber,
  getSerialNumbersForMachine,
};
