require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const logger = require("./logger");
const authenticateToken = require("./middleware/authMiddleware");

// Import Routes
const authRoutes = require("./routes/auth");
const clientRoutes = require("./routes/clients");
const machineRoutes = require("./routes/machines");
const partRoutes = require("./routes/parts");
const profileRoutes = require("./routes/profiles");
const repairRoutes = require("./routes/repairs");
const repairPartsRoutes = require("./routes/repair_parts");
const serialNumbersRoutes = require("./routes/serial_numbers");
const statsRoutes = require("./routes/stats");
const searchRoutes = require("./routes/search");
const admissionRoutes = require("./routes/admissions");

// ✅ Create Express App
const app = express();

// ✅ Security Headers
app.use(helmet());

// ✅ Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true, // ✅ Allows frontend to send cookies
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ Rate Limiting (Apply only to API Routes)
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later.",
});

// ✅ Register Search API Route BEFORE authentication middleware
app.use(
  "/api/search",
  (req, res, next) => {
    console.log(`🔍 Search API Request: ${req.method} ${req.url}`);
    next();
  },
  searchRoutes
);

// ✅ Register API Routes (Authentication Required)
app.use("/auth", authRoutes);
app.use("/clients", authenticateToken, clientRoutes);
app.use("/machines", authenticateToken, machineRoutes);
app.use("/parts", authenticateToken, partRoutes);
app.use("/profiles", authenticateToken, profileRoutes);
app.use("/repairs", authenticateToken, repairRoutes);
app.use("/repair_parts", authenticateToken, repairPartsRoutes);
app.use("/serial_numbers", authenticateToken, serialNumbersRoutes);
app.use("/stats", authenticateToken, statsRoutes);
app.use("/admissions", authenticateToken, admissionRoutes);

// ✅ Global Request Logger
app.use((req, res, next) => {
  const userRole = req.user?.role || "guest";
  logger.info(
    `Request: ${req.method} ${req.url} - User Role: ${userRole} - IP: ${req.ip}`
  );
  next();
});

// ✅ Test Route
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ API is running..." });
});

// ✅ Handle 404 Errors
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  logger.error(`Server Error: ${err.message} - IP: ${req.ip}`);
  res.status(500).json({ error: "Something went wrong!" });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`✅ Server running on port ${PORT}`));
