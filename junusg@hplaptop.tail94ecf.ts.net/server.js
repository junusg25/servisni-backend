require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet"); // Security Headers
const logger = require("./logger");
const pool = require("./db");

// Import Routes
const authRoutes = require("./routes/auth");
const clientRoutes = require("./routes/clients");
const machineRoutes = require("./routes/machines");
const partRoutes = require("./routes/parts");
const profileRoutes = require("./routes/profiles");
const repairRoutes = require("./routes/repairs");
const repairPartsRoutes = require("./routes/repair_parts");
const serialNumbersRoutes = require("./routes/serial_numbers");

const app = express();

// Security: Add Secure HTTP Headers
app.use(helmet());

// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security: Apply Rate Limiting Only to API Routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later.",
});

// Apply Rate Limiting Only on API Endpoints
app.use("/auth", apiLimiter, authRoutes);
app.use("/clients", apiLimiter, clientRoutes);
app.use("/machines", apiLimiter, machineRoutes);
app.use("/parts", apiLimiter, partRoutes);
app.use("/profiles", apiLimiter, profileRoutes);
app.use("/repairs", apiLimiter, repairRoutes);
app.use("/repair_parts", apiLimiter, repairPartsRoutes);
app.use("/serial_numbers", apiLimiter, serialNumbersRoutes);

// Global Request Logging Middleware (Logs User Actions)
app.use((req, res, next) => {
  const userId = req.user ? req.user.user_id : "Guest";
  const userEmail = req.user ? req.user.email : "Guest";
  const userIp = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  logger.info(
    `Request: ${req.method} ${req.url} - User: ${userId} (${userEmail}) - IP: ${userIp}`
  );
  next();
});

// Test Route
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ API is running..." });
});

// Handle Unauthorized Access
app.use((req, res, next) => {
  if (!req.user) {
    logger.warn(
      `Unauthorized Access Attempt - ${req.method} ${req.url} - IP: ${
        req.headers["x-forwarded-for"] || req.connection.remoteAddress
      }`
    );
    return res.status(403).json({ error: "Unauthorized access" });
  }
  next();
});

// Handle 404 Errors
app.use((req, res, next) => {
  logger.warn(
    `404 Not Found: ${req.method} ${req.url} - IP: ${
      req.headers["x-forwarded-for"] || req.connection.remoteAddress
    }`
  );
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error(
    `500 Server Error: ${err.message} - IP: ${
      req.headers["x-forwarded-for"] || req.connection.remoteAddress
    }`
  );
  res.status(500).json({ error: "Something went wrong!" });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`✅ Server running on port ${PORT}`));
