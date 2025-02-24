const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const logger = require("../logger");
require("dotenv").config();

// ✅ User Registration
const registerUser = async (req, res) => {
  try {
    const { full_name, email, phone, password, role_id } = req.body;

    // ✅ Check if user already exists
    const userExists = await pool.query(
      `SELECT * FROM profiles WHERE email = $1`,
      [email]
    );
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    // ✅ Hash the password before storing it
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // ✅ Insert new user into the database
    const newUser = await pool.query(
      `INSERT INTO profiles (full_name, email, phone, password) 
       VALUES ($1, $2, $3, $4) RETURNING user_id`,
      [full_name, email, phone, hashedPassword]
    );

    // ✅ Assign a role if provided
    if (role_id) {
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
        [newUser.rows[0].user_id, role_id]
      );
    }

    logger.info(`User Registered - Email: ${email}`);

    res.status(201).json({
      message: "User registered successfully!",
      user_id: newUser.rows[0].user_id,
    });
  } catch (err) {
    logger.error(`❌ Error registering user: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ User Login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const userQuery = await pool.query(
      `SELECT p.user_id, p.full_name, p.email, p.password, r.role_name 
       FROM profiles p
       LEFT JOIN user_roles ur ON p.user_id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE p.email = $1`,
      [email]
    );

    if (userQuery.rows.length === 0) {
      logger.warn(`Login failed - Invalid email: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userQuery.rows[0];

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn(`Login failed - Invalid password for email: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        full_name: user.full_name,
        role: user.role_name || "user",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // ✅ Set secure HTTP-only cookie
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: false, // Set to true in production (HTTPS)
      sameSite: "Lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    logger.info(`User logged in - Email: ${email}`);

    res.json({
      message: "Login successful!",
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role_name || "user",
      },
    });
  } catch (err) {
    logger.error(`❌ Login error: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ User Logout
const logoutUser = (req, res) => {
  try {
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      path: "/",
    });

    logger.info("User logged out");
    res.json({ message: "Logout successful!" });
  } catch (err) {
    logger.error(`❌ Logout error: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { loginUser, logoutUser, registerUser };
