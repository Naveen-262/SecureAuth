// DNS Configuration
const dns = require("node:dns");

dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);
// ==========================================
// SECUREAUTH - MAIN SERVER
// Production Ready Configuration
// ==========================================

const path = require("path");

// ==========================================
// ENVIRONMENT VARIABLES
// ==========================================

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

// ==========================================
// EXTERNAL PACKAGES
// ==========================================

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");

// ==========================================
// PROJECT MODULES
// ==========================================

const connectDB = require("./config/db");
const User = require("./models/User");

// ==========================================
// INITIALIZE EXPRESS
// ==========================================

const app = express();

// Trust Render's reverse proxy
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

// ==========================================
// SECURITY CONFIGURATION
// ==========================================

app.disable("x-powered-by");

app.use(helmet());

app.use(express.json({
    limit: "10kb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "10kb"
}));

// ==========================================
// AUTHENTICATION RATE LIMITING
// ==========================================

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many authentication attempts. Try again later."
    }
});

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
// FRONTEND STATIC FILES
// ==========================================

const frontendPath = path.join(__dirname, "../frontend");

app.use(express.static(frontendPath));

// ==========================================
// HOMEPAGE
// ==========================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(frontendPath, "index.html")
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
            "Admin bootstrap skipped: ADMIN_EMAIL or ADMIN_PASSWORD missing."
        );

        return;
    }

    if (password.length < 12 || password.length > 72) {

        throw new Error(
            "ADMIN_PASSWORD must contain 12-72 characters."
        );

    }

    const existingAdmin = await User.findOne({
        email
    });

    if (existingAdmin) {

        if (existingAdmin.role !== "admin") {

            throw new Error(
                "Configured ADMIN_EMAIL belongs to a non-admin account."
            );

        }

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

    try {

        // Validate environment variables
        if (!process.env.MONGO_URI) {

            throw new Error(
                "MONGO_URI is missing."
            );

        }

        if (!process.env.JWT_SECRET) {

            throw new Error(
                "JWT_SECRET is missing."
            );

        }

        if (process.env.JWT_SECRET.length < 32) {

            throw new Error(
                "JWT_SECRET must contain at least 32 characters."
            );

        }

        // Connect MongoDB
        await connectDB();

        console.log("MongoDB connected successfully.");

        // Create initial admin
        await createInitialAdmin();

        // Start Express server
        const server = app.listen(PORT, "0.0.0.0", () => {

            console.log("--------------------------------");

            console.log(
                `SecureAuth running on port ${PORT}`
            );

            console.log(
                `Environment: ${process.env.NODE_ENV || "development"}`
            );

            console.log("Server Status: RUNNING");

            console.log("--------------------------------");

        });

        // Handle unexpected server errors
        server.on("error", (error) => {

            console.error("Server Error:", error.message);

            process.exit(1);

        });

    } catch (error) {

        console.error(
            "Server startup failed:",
            error.message
        );

        process.exit(1);

    }

}

// ==========================================
// RUN APPLICATION
// ==========================================

startServer();