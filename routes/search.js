const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", async (req, res) => {
  const { query, type } = req.query;

  console.log(
    `🔍 Incoming search request: query="${query}", type="${type || "ALL"}"`
  );

  if (!query) {
    return res.status(400).json({ error: "Search query is required" });
  }

  try {
    const results = {
      clients: [],
      machines: [],
      repairs: [],
      parts: [],
      serials: [],
    };

    // ✅ Search Clients
    if (!type || type === "clients") {
      console.log("🔍 Searching clients...");
      const clients = await pool.query(
        `SELECT id, name, email, phone FROM clients 
         WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
         LIMIT 5`,
        [`%${query}%`]
      );
      results.clients = clients.rows;
    }

    // ✅ Search Machines
    if (!type || type === "machines") {
      console.log("🔍 Searching machines...");
      const machines = await pool.query(
        `SELECT id, model_name, catalog_number, url, date_of_adding, notes 
         FROM machines 
         WHERE model_name ILIKE $1 OR catalog_number ILIKE $1 
         LIMIT 5`,
        [`%${query}%`]
      );
      results.machines = machines.rows;
    }

    // ✅ Search Repairs
    if (!type || type === "repairs") {
      console.log("🔍 Searching repairs...");
      const repairs = await pool.query(
        `SELECT r.id, r.repair_name, r.description, r.repair_date, 
                c.name AS client_name, m.model_name AS machine_name
         FROM repairs r
         JOIN clients c ON r.client_id = c.id
         JOIN machines m ON r.repaired_machine = m.id
         WHERE r.repair_name ILIKE $1 OR c.name ILIKE $1 OR m.model_name ILIKE $1
         LIMIT 5`,
        [`%${query}%`]
      );
      results.repairs = repairs.rows;
    }

    // ✅ Search Parts
    if (!type || type === "parts") {
      console.log("🔍 Searching parts...");
      const parts = await pool.query(
        `SELECT id, name, catalog_number FROM parts 
         WHERE name ILIKE $1 OR catalog_number ILIKE $1
         LIMIT 5`,
        [`%${query}%`]
      );
      results.parts = parts.rows;
    }

    // ✅ Search Serial Numbers
    if (!type || type === "serials") {
      console.log("🔍 Searching serial numbers...");
      const serials = await pool.query(
        `SELECT s.id, s.serial AS serial_number, s.date_of_sale,
            m.id AS machine_id, m.model_name AS machine_name, m.catalog_number,
            c.id AS client_id, c.name AS client_name
     FROM serial_numbers s
     JOIN machines m ON s.machine_id = m.id
     LEFT JOIN clients c ON s.client_id = c.id
     WHERE s.serial ILIKE $1
     LIMIT 5`,
        [`%${query}%`]
      );
      results.serials = serials.rows;
    }

    console.log(`✅ Search Results:`, results);

    res.json(results);
  } catch (err) {
    console.error("❌ Error searching database:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
