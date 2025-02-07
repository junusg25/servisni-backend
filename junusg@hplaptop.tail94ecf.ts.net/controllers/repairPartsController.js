const pool = require("../db");
const logger = require("../logger"); // Import Winston Logger

// Get parts used in a specific repair
const getRepairParts = async (req, res) => {
  try {
    const { repair_id } = req.query;
    if (!repair_id) {
      logger.warn("Repair ID is required for fetching repair parts.");
      return res.status(400).json({ error: "Repair ID is required" });
    }

    const repairParts = await pool.query(
      `SELECT rp.id, rp.repair_id, rp.part_id, p.name AS part_name, p.description, p.price
       FROM repair_parts rp
       JOIN parts p ON rp.part_id = p.id
       WHERE rp.repair_id = $1`,
      [repair_id]
    );

    logger.info(`Repair Parts Retrieved - Repair ID: ${repair_id}`);
    res.status(200).json(repairParts.rows);
  } catch (err) {
    logger.error(`❌ Error fetching repair parts: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Add a part to a repair
const addRepairPart = async (req, res) => {
  try {
    const { repair_id, part_id } = req.body;

    // Validate that repair and part exist
    const repairExists = await pool.query(
      "SELECT id FROM repairs WHERE id = $1",
      [repair_id]
    );
    if (repairExists.rows.length === 0) {
      logger.warn(`Add Repair Part Failed - Repair Not Found: ${repair_id}`);
      return res.status(400).json({ error: "Repair does not exist" });
    }

    const partExists = await pool.query("SELECT id FROM parts WHERE id = $1", [
      part_id,
    ]);
    if (partExists.rows.length === 0) {
      logger.warn(`Add Repair Part Failed - Part Not Found: ${part_id}`);
      return res.status(400).json({ error: "Part does not exist" });
    }

    const newRepairPart = await pool.query(
      "INSERT INTO repair_parts (repair_id, part_id) VALUES ($1, $2) RETURNING *",
      [repair_id, part_id]
    );

    logger.info(
      `Part Added to Repair - Repair ID: ${repair_id}, Part ID: ${part_id}, Added By: ${
        req.user ? req.user.email : "Unknown"
      }`
    );

    res.status(201).json({
      message: "Part added to repair",
      repairPart: newRepairPart.rows[0],
    });
  } catch (err) {
    logger.error(`❌ Error adding part to repair: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// Remove a part from a repair
const deleteRepairPart = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if repair_part exists
    const existingRepairPart = await pool.query(
      "SELECT * FROM repair_parts WHERE id = $1",
      [id]
    );
    if (existingRepairPart.rows.length === 0) {
      logger.warn(`Repair Part Not Found for Deletion - ID: ${id}`);
      return res.status(404).json({ error: "Repair part not found" });
    }

    await pool.query("DELETE FROM repair_parts WHERE id = $1", [id]);

    logger.info(
      `Repair Part Deleted - ID: ${id}, Deleted By: ${
        req.user ? req.user.email : "Unknown"
      }`
    );

    res.status(200).json({ message: "Part removed from repair" });
  } catch (err) {
    logger.error(`❌ Error deleting repair part: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getRepairParts, addRepairPart, deleteRepairPart };
