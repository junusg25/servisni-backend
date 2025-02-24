const pool = require("../db");
const logger = require("../logger");

// ✅ Add New Admission
const addAdmission = async (req, res) => {
  try {
    const {
      client_id,
      machine_id,
      serial_number,
      catalog_number,
      device_status,
      problem_description,
      additional_equipment,
      notes,
    } = req.body;

    if (!client_id || !machine_id) {
      return res.status(400).json({ error: "Klijent i Mašina su obavezni" });
    }

    // ✅ Insert into database
    const newAdmission = await pool.query(
      `INSERT INTO admissions 
       (client_id, machine_id, serial_number, catalog_number, device_status, 
        problem_description, additional_equipment, notes, received_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, admission_date`,
      [
        client_id,
        machine_id,
        serial_number,
        catalog_number,
        device_status,
        problem_description,
        additional_equipment,
        notes,
        req.user.user_id, // Receptionist ID
      ]
    );

    // ✅ Generate formatted admission name (ID/YY)
    const admissionId = newAdmission.rows[0].id;
    const admissionYear = new Date(newAdmission.rows[0].admission_date)
      .getFullYear()
      .toString()
      .slice(-2);
    const admissionName = `${admissionId}/${admissionYear}`;

    await pool.query(
      `UPDATE admissions SET admission_name = $1 WHERE id = $2`,
      [admissionName, admissionId]
    );

    logger.info(`✅ Prijemnica kreirana - ID: ${admissionName}`);

    res.status(201).json({
      message: "✅ Prijemnica uspješno dodana!",
      admission_id: admissionId,
      admission_name: admissionName,
    });
  } catch (err) {
    logger.error(`❌ Greška pri dodavanju prijema: ${err.message}`);
    res.status(500).json({ error: "Greška na serveru" });
  }
};

// ✅ Get All Admissions
const getAdmissions = async (req, res) => {
  try {
    const admissions = await pool.query(`
      SELECT 
        a.id, 
        a.admission_name, 
        c.name AS client_name, 
        m.model_name AS machine_name, 
        COALESCE(a.serial_number, 'N/A') AS serial_number, 
        COALESCE(a.catalog_number, 'N/A') AS catalog_number, 
        a.device_status, 
        a.problem_description, 
        COALESCE(a.additional_equipment, 'Nema dodatne opreme') AS additional_equipment, 
        COALESCE(a.notes, 'Nema bilješki') AS notes, 
        TO_CHAR(a.admission_date, 'DD.MM.YYYY - TMDay') AS admission_date,
        COALESCE(p.full_name, 'Nepoznato') AS received_by
      FROM admissions a
      JOIN clients c ON a.client_id = c.id
      JOIN machines m ON a.machine_id = m.id
      LEFT JOIN profiles p ON a.received_by = p.user_id
      ORDER BY a.admission_date DESC;
    `);

    logger.info(`✅ Prijemnice učitane - Ukupno: ${admissions.rows.length}`);

    res.status(200).json(admissions.rows);
  } catch (err) {
    logger.error(`❌ Greška pri učitavanju prijemnica: ${err.message}`);
    res.status(500).json({ error: "Greška na serveru" });
  }
};

// ✅ Get Single Admission by ID
const getAdmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    const admission = await pool.query(
      `SELECT 
        a.id, 
        a.admission_name, 
        c.name AS client_name, 
        m.model_name AS machine_name, 
        COALESCE(a.serial_number, 'N/A') AS serial_number, 
        COALESCE(a.catalog_number, 'N/A') AS catalog_number, 
        a.device_status, 
        a.problem_description, 
        COALESCE(a.additional_equipment, 'Nema dodatne opreme') AS additional_equipment, 
        COALESCE(a.notes, 'Nema bilješki') AS notes, 
        TO_CHAR(a.admission_date, 'DD.MM.YYYY - TMDay') AS admission_date,
        COALESCE(p.full_name, 'Nepoznato') AS received_by
       FROM admissions a
       JOIN clients c ON a.client_id = c.id
       JOIN machines m ON a.machine_id = m.id
       LEFT JOIN profiles p ON a.received_by = p.user_id
       WHERE a.id = $1`,
      [id]
    );

    if (admission.rows.length === 0) {
      return res.status(404).json({ error: "Prijemnica nije pronađena" });
    }

    logger.info(`✅ Prijemnica učitana - ID: ${id}`);

    res.status(200).json(admission.rows[0]);
  } catch (err) {
    logger.error(`❌ Greška pri učitavanju prijemnice: ${err.message}`);
    res.status(500).json({ error: "Greška na serveru" });
  }
};

module.exports = {
  addAdmission,
  getAdmissions,
  getAdmissionById,
};
