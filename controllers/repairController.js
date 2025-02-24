const pool = require("../db");
const logger = require("../logger");

// ✅ Get all repairs (with pagination, filtering, and sorting)
const getRepairs = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    const query = `
      SELECT r.id, 
             r.repair_name, 
             c.name AS client_name, 
             c.email AS client_email,  
             c.phone AS client_phone,  
             c.address AS client_address,  
             c.city AS client_city,  
             p.full_name AS repairman_name,  
             TO_CHAR(r.repair_date, 'DD.MM.YYYY - FMDay') AS repair_date,
             r.description AS repair_description,  
             m.model_name AS machine_name,  
             m.catalog_number AS catalog_number,  -- ✅ FIX: Include catalog_number
             s.serial AS serial_number,  
             COALESCE(
               json_agg(
                 json_build_object(
                   'name', pa.name, 
                   'quantity', COALESCE(rp.quantity, 0)
                 )
               ) FILTER (WHERE pa.name IS NOT NULL), 
               '[]'
             )::TEXT AS parts_used  
      FROM repairs r
      JOIN clients c ON r.client_id = c.id
      JOIN profiles p ON r.repaired_by = p.user_id
      JOIN machines m ON r.repaired_machine = m.id
      LEFT JOIN serial_numbers s ON r.serial_number_id = s.id
      LEFT JOIN repair_parts rp ON r.id = rp.repair_id
      LEFT JOIN parts pa ON rp.part_id = pa.id
      GROUP BY r.id, c.id, p.full_name, m.model_name, m.catalog_number, s.serial  -- ✅ FIX: Added catalog_number in GROUP BY
      ORDER BY r.repair_name ASC  
      LIMIT $1 OFFSET $2;
    `;

    const repairs = await pool.query(query, [limit, offset]);

    res.status(200).json({
      total: repairs.rowCount,
      page,
      limit,
      data: repairs.rows.map((repair) => ({
        ...repair,
        parts_used: JSON.parse(repair.parts_used),
      })),
    });
  } catch (err) {
    console.error("❌ Error fetching repairs:", err.message);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// ✅ Get a single repair by ID
const getRepairById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT r.id, 
             r.repair_name, 
             c.name AS client_name, 
             c.email AS client_email,  
             c.phone AS client_phone,  
             c.address AS client_address,  
             c.city AS client_city,  
             p.full_name AS repairman_name,  
             TO_CHAR(r.repair_date, 'DD.MM.YYYY - FMDay') AS repair_date,
             r.description AS repair_description,  
             m.id AS machine_id,  
             m.model_name AS machine_name,  
             m.catalog_number AS catalog_number,  -- ✅ FIX: Include catalog_number
             s.id AS serial_id,  
             s.serial AS serial_number,  
             COALESCE(
               json_agg(
                 json_build_object(
                   'name', pa.name, 
                   'quantity', COALESCE(rp.quantity, 0)
                 )
               ) FILTER (WHERE pa.name IS NOT NULL), 
               '[]'
             )::TEXT AS parts_used  
      FROM repairs r
      JOIN clients c ON r.client_id = c.id
      JOIN profiles p ON r.repaired_by = p.user_id
      JOIN machines m ON r.repaired_machine = m.id
      LEFT JOIN serial_numbers s ON r.serial_number_id = s.id
      LEFT JOIN repair_parts rp ON r.id = rp.repair_id
      LEFT JOIN parts pa ON rp.part_id = pa.id
      WHERE r.id = $1
      GROUP BY r.id, c.id, p.full_name, m.id, m.model_name, m.catalog_number, s.id, s.serial;  -- ✅ FIX: Added catalog_number in GROUP BY
    `;

    const repair = await pool.query(query, [id]);

    if (repair.rows.length === 0) {
      return res.status(404).json({ error: "Repair not found" });
    }

    res.status(200).json({
      ...repair.rows[0],
      parts_used: JSON.parse(repair.rows[0].parts_used),
    });
  } catch (err) {
    console.error("❌ Error fetching repair:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Add a new repair
const addRepair = async (req, res) => {
  try {
    const {
      client_id,
      repaired_by,
      repair_date,
      description,
      parts_used,
      repaired_machine,
      serial_number_id,
    } = req.body;

    // ✅ Insert new repair (without repair_name)
    const newRepair = await pool.query(
      `INSERT INTO repairs (client_id, repaired_by, repair_date, description, repaired_machine, serial_number_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, repair_date`,
      [
        client_id,
        repaired_by,
        repair_date,
        description,
        repaired_machine,
        serial_number_id,
      ]
    );

    // ✅ Extract Repair ID and Year
    const repairId = newRepair.rows[0].id;
    const repairYear = new Date(repair_date).getFullYear().toString().slice(-2); // ✅ Get last two digits of year

    // ✅ Generate Repair Name in format `id/YY`
    const repairName = `${repairId}/${repairYear}`;

    // ✅ Update Repair with Generated Repair Name
    await pool.query(`UPDATE repairs SET repair_name = $1 WHERE id = $2`, [
      repairName,
      repairId,
    ]);

    // ✅ Insert parts used into `repair_parts`
    if (parts_used && parts_used.length > 0) {
      const insertPartsQuery = `
        INSERT INTO repair_parts (repair_id, part_id, quantity) 
        VALUES ${parts_used
          .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
          .join(", ")}
      `;

      await pool.query(insertPartsQuery, [
        repairId,
        ...parts_used.flatMap((p) => [p.part_id, p.quantity]),
      ]);
    }

    res.status(201).json({
      message: "Repair added successfully!",
      repair_id: repairId,
      repair_name: repairName, // ✅ Include repair_name in response
    });
  } catch (err) {
    console.error("❌ Error adding repair:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// ✅ Update an existing repair
const updateRepair = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      client_id,
      repaired_by,
      repair_date,
      description,
      repaired_machine,
      serial_number_id,
      parts_used, // 👈 Include this in request
    } = req.body;

    // ✅ Step 1: Update Repairs Table
    await pool.query(
      `UPDATE repairs 
       SET client_id = COALESCE($1, client_id), 
           repaired_by = COALESCE($2, repaired_by), 
           repair_date = COALESCE($3, repair_date), 
           description = COALESCE($4, description), 
           repaired_machine = COALESCE($5, repaired_machine), 
           serial_number_id = COALESCE($6, serial_number_id)
       WHERE id = $7`,
      [
        client_id,
        repaired_by,
        repair_date,
        description,
        repaired_machine,
        serial_number_id,
        id,
      ]
    );

    // ✅ Step 2: Update Parts Used in the Repair
    if (parts_used) {
      // 🔥 Delete existing parts for this repair
      await pool.query(`DELETE FROM repair_parts WHERE repair_id = $1`, [id]);

      // 🔥 Insert new parts
      if (parts_used.length > 0) {
        const insertPartsQuery = `
          INSERT INTO repair_parts (repair_id, part_id, quantity) 
          VALUES ${parts_used
            .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
            .join(", ")}
        `;

        await pool.query(insertPartsQuery, [
          id,
          ...parts_used.flatMap((p) => [p.part_id, p.quantity]),
        ]);
      }
    }

    res.status(200).json({ message: "Repair updated successfully!" });
  } catch (err) {
    console.error("❌ Error updating repair:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Delete a repair
const deleteRepair = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM repairs WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Repair not found" });
    }

    res.status(200).json({ message: "Repair deleted successfully!" });
  } catch (err) {
    console.error("❌ Error deleting repair:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get repairs for a specific machine
const getRepairsForMachine = async (req, res) => {
  try {
    const { machine_id, client_id } = req.params;

    const query = `
      SELECT r.id, 
             r.repair_name, 
             TO_CHAR(r.repair_date, 'DD.MM.YYYY - FMDay') AS repair_date,
             s.serial AS serial_number
      FROM serial_numbers s
      LEFT JOIN repairs r ON s.id = r.serial_number_id
      WHERE s.machine_id = $1 AND s.client_id = $2
      ORDER BY r.repair_date DESC NULLS LAST;
    `;

    const repairs = await pool.query(query, [machine_id, client_id]);

    res.status(200).json({ data: repairs.rows });
  } catch (err) {
    console.error("❌ Error fetching repairs for machine:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getRepairs,
  getRepairById,
  addRepair,
  updateRepair,
  deleteRepair,
  getRepairsForMachine,
};
