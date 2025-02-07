const express = require("express");
const bcrypt = require("bcryptjs"); // Using bcryptjs
const jwt = require("jsonwebtoken");
const pool = require("../db");
const logger = require("../logger"); // Winston Logger
const { body, validationResult } = require("express-validator");

const router = express.Router();

// Validation Middleware
const validateUser = [
  body("full_name").notEmpty().withMessage("Full name is required"),
  body("email").isEmail().withMessage("Invalid email format"),
  body("phone").isMobilePhone().withMessage("Invalid phone number"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

// Register a new user
router.post("/register", validateUser, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn("User Registration Failed - Validation Errors");
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { full_name, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT * FROM profiles WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      logger.warn(
        `User Registration Failed - Email Already Registered: ${email}`
      );
      return res.status(400).json({ error: "Email is already registered" });
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO profiles (full_name, email, phone, password) VALUES ($1, $2, $3, $4) RETURNING user_id, full_name, email, phone",
      [full_name, email, phone, hashedPassword]
    );

    logger.info(`New User Registered - Email: ${email}`);

    res.status(201).json({
      message: "User registered successfully!",
      user: newUser.rows[0], // No password is returned
    });
  } catch (err) {
    logger.error(`❌ Error registering user: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
});

// User login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await pool.query(
      `SELECT p.user_id, p.full_name, p.email, p.password, r.role_name 
       FROM profiles p
       LEFT JOIN user_roles ur ON p.user_id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE p.email = $1`,
      [email]
    );

    if (user.rows.length === 0) {
      logger.warn(`Failed Login Attempt - Invalid Email: ${email}`);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) {
      logger.warn(
        `Failed Login Attempt - Invalid Password for Email: ${email}`
      );
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.rows[0].user_id, role: user.rows[0].role_name || "user" }, // Assign "user" if no role
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    logger.info(`User Logged In - Email: ${email}`);

    res.json({
      message: "Login successful!",
      token,
      user: {
        user_id: user.rows[0].user_id,
        full_name: user.rows[0].full_name,
        email: user.rows[0].email,
        role: user.rows[0].role_name || "user", // Assign "user" if no role
      },
    });
  } catch (err) {
    logger.error(`❌ Error during login: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
