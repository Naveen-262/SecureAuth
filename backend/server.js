
// ==========================================
// SECUREAUTH - MAIN SERVER
// ==========================================

// DNS Configuration
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

// Core Modules
const path = require("path");

// Environment Variables
require("dotenv").config({
    path: path.join(__dirname, ".env")
});

// External Packages
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");

// Project Modules
const connectDB = require("./config/db");
const User = require("./models/User");

// Initialize Express
const app = express();

// ==========================================
// SECURITY CONFIGURATION
// ==========================================

// Hide Express Information
app.disable("x-powered-by");

// Helmet Security Headers
app.use(helmet());

// CORS Configuration
app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5000"
}));

// JSON Body Limit
app.use(express.json({
    limit: "10kb"
}));

// Authentication Rate Limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many authentication attempts. Try again later."
    }
});

// Apply Rate Limiting
app.use("/api/auth", authLimiter);

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/auth", require("./routes/authRoutes"));

app.use("/api/admin", require("./routes/adminRoutes"));

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        application: "SecureAuth",
        message: "Server running successfully"
    });
});

// ==========================================
// FRONTEND CONFIGURATION
// ==========================================

// Serve Frontend Static Files
app.use(express.static(
    path.join(__dirname, "../frontend")
));

// Homepage
app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../frontend/index.html")
    );
});

// ==========================================
// INITIAL ADMIN CREATION
// ==========================================

async function createInitialAdmin() {

    const email = process.env.ADMIN_EMAIL
        ?.trim()
        .toLowerCase();

    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
        console.log(
            "Admin bootstrap skipped: configure ADMIN_EMAIL and ADMIN_PASSWORD."
        );
        return;
    }

    if (password.length < 12 || password.length > 72) {
        throw new Error(
            "ADMIN_PASSWORD must contain 12-72 characters."
        );
    }

    const existing = await User.findOne({ email });

    if (existing) {

        console.log("Admin account already exists.");

        return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
        name: "System Admin",
        email,
        password: hashedPassword,
        role: "admin"
    });

    console.log("Initial admin account created.");
}

// ==========================================
// SERVER CONFIGURATION
// ==========================================

const PORT = process.env.PORT || 5000;

// ==========================================
// START SERVER
// ==========================================

async function startServer() {

    // Environment Validation
    if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {

        throw new Error(
            "MONGO_URI and JWT_SECRET must be configured."
        );
    }

    // Connect MongoDB
    await connectDB();

    console.log("MongoDB connected successfully.");

    // Create Initial Admin
    await createInitialAdmin();

    // Start Express Server
    app.listen(PORT, () => {

        console.log("--------------------------------");

        console.log(
            `SecureAuth running at http://localhost:${PORT}`
        );

        console.log("Server Status: RUNNING");

        console.log("--------------------------------");

    });
}

// Handle Startup Errors
startServer().catch(error => {

    console.error(
        "Server startup failed:",
        error.message
    );

    process.exit(1);

});
