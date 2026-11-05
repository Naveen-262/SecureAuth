const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

// All routes require authentication and admin role
router.use(protect, adminOnly);

// Escape special regex characters
const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// VIEW ALL USERS + SEARCH
router.get("/users", async (req, res) => {
    try {
        const search = String(req.query.search || "")
            .trim()
            .slice(0, 50);

        const filter = search
            ? {
                $or: [
                    {
                        name: {
                            $regex: escapeRegex(search),
                            $options: "i"
                        }
                    },
                    {
                        email: {
                            $regex: escapeRegex(search),
                            $options: "i"
                        }
                    }
                ]
            }
            : {};

        const users = await User.find(filter)
            .select("-password")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const total = await User.countDocuments(filter);

        return res.json({
            total,
            users
        });

    } catch (error) {
        console.error("Fetch users error:", error.message);

        return res.status(500).json({
            message: "Unable to fetch users"
        });
    }
});

// DASHBOARD ANALYTICS
router.get("/analytics", async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();

        const totalAdmins = await User.countDocuments({
            role: "admin"
        });

        const regularUsers = await User.countDocuments({
            role: "user"
        });

        return res.json({
            stats: {
                totalUsers,
                totalAdmins,
                regularUsers
            }
        });

    } catch (error) {
        console.error("Analytics error:", error.message);

        return res.status(500).json({
            message: "Analytics unavailable"
        });
    }
});

// DELETE USER
router.delete("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        // Prevent deleting own account
        if (id === req.user._id.toString()) {
            return res.status(400).json({
                message: "You cannot delete your own account"
            });
        }

        // Find user first
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Protect admin accounts
        if (user.role === "admin") {
            return res.status(403).json({
                message: "Admin accounts cannot be deleted"
            });
        }

        await User.findByIdAndDelete(id);

        return res.json({
            message: "User deleted successfully"
        });

    } catch (error) {
        console.error("Delete user error:", error.message);

        return res.status(500).json({
            message: "Delete failed"
        });
    }
});

module.exports = router;