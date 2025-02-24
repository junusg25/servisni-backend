const express = require("express");
const router = express.Router();
const pool = require("../db"); // PostgreSQL Database Connection

// ✅ Get Dashboard Stats
router.get("/", async (req, res) => {
  try {
    const totalClients = await pool.query("SELECT COUNT(*) FROM clients");
    const totalMachines = await pool.query("SELECT COUNT(*) FROM machines");
    const totalRepairs = await pool.query("SELECT COUNT(*) FROM repairs");
    const totalParts = await pool.query("SELECT COUNT(*) FROM parts");

    res.json({
      totalClients: totalClients.rows[0].count,
      totalMachines: totalMachines.rows[0].count,
      totalRepairs: totalRepairs.rows[0].count,
      totalParts: totalParts.rows[0].count,
    });
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ✅ Top Used Parts (Most frequently used in repairs)
router.get("/top-used-parts", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT parts.name, COUNT(repair_parts.part_id) AS usage_count
      FROM repair_parts
      JOIN parts ON repair_parts.part_id = parts.id
      GROUP BY parts.name
      ORDER BY usage_count DESC
      LIMIT 5;
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch top used parts" });
  }
});

// ✅ Top Machines Assigned (Machines with most repairs)
router.get("/top-assigned-machines", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
          m.model_name AS "Machine Name", 
          COUNT(s.id) AS "Assigned Count"
      FROM serial_numbers s
      JOIN machines m ON s.machine_id = m.id
      GROUP BY m.model_name
      ORDER BY "Assigned Count" DESC
      LIMIT 5;
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching top assigned machines:", error);
    res.status(500).json({ error: "Failed to fetch top assigned machines" });
  }
});

// ✅ NEW: Top Repaired Machines
router.get("/top-repaired-machines", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT machines.model_name AS "Machine Name", COUNT(repairs.id) AS "Repair Count"
      FROM repairs
      JOIN machines ON repairs.repaired_machine = machines.id
      GROUP BY machines.model_name
      ORDER BY "Repair Count" DESC
      LIMIT 5;
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch top repaired machines" });
  }
});

// ✅ NEW: Recent Repairs (Formatted Date)
// ✅ NEW: Recent Repairs (Include repair_id)
router.get("/recent-repairs", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        repairs.id AS repair_id,  -- ✅ Include repair_id for frontend navigation
        machines.model_name AS "Machine", 
        TO_CHAR(repairs.repair_date, 'DD.MM.YYYY - TMDay') AS "Repair Date"
      FROM repairs
      JOIN machines ON repairs.repaired_machine = machines.id
      ORDER BY repairs.repair_date DESC
      LIMIT 5;
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching recent repairs:", error);
    res.status(500).json({ error: "Failed to fetch recent repairs" });
  }
});

// ✅ NEW: Top Technicians (Based on Number of Repairs Handled)
router.get("/top-technicians", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT profiles.full_name AS "Technician Name", COUNT(repairs.id) AS "Repairs Handled"
      FROM repairs
      JOIN profiles ON repairs.repaired_by = profiles.user_id
      GROUP BY profiles.full_name
      ORDER BY "Repairs Handled" DESC
      LIMIT 5;
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch top technicians" });
  }
});

module.exports = router;
