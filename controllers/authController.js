const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const logger = require("../logger"); // Winston Logger
require("dotenv").config();

// User Registration
const register = async (req, res) => {
  try {
    const { full_name, email, phone, password } = req.body;

    // Check if email is already registered
    const existingUser = await pool.query(
      "SELECT * FROM profiles WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      logger.warn(`Registration Failed - Email Already Exists: ${email}`);
      return res.status(400).json({ error: "Email is already registered" });
    }

    // Hash password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into database
    const newUser = await pool.query(
      "INSERT INTO profiles (full_name, email, phone, password) VALUES ($1, $2, $3, $4) RETURNING user_id, full_name, email, phone",
      [full_name, email, phone, hashedPassword]
    );

    logger.info(`User Registered - Email: ${email}, Name: ${full_name}`);

    res.status(201).json({
      message: "User registered successfully!",
      user: newUser.rows[0],
    });
  } catch (err) {
    logger.error(`❌ Registration Error: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// User Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await pool.query("SELECT * FROM profiles WHERE email = $1", [
      email,
    ]);

    if (user.rows.length === 0) {
      logger.warn(`Login Failed - Email Not Found: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) {
      logger.warn(`Login Failed - Incorrect Password: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.rows[0].user_id, email: user.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Set secure HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    logger.info(`Login Successful - User: ${email}`);

    res.json({ message: "Login successful!", token });
  } catch (err) {
    logger.error(`❌ Login Error: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// User Logout
const logout = async (req, res) => {
  try {
    res.cookie("token", "", { expires: new Date(0), httpOnly: true });
    logger.info(`User Logged Out - IP: ${req.ip}`);
    res.status(200).json({ message: "Logged out successfully!" });
  } catch (err) {
    logger.error(`❌ Logout Error: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { register, login, logout };
