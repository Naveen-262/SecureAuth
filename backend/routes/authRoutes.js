const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

const User = require("../models/User");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: "Validation failed",
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg
            }))
        });
    }

    next();
};

const generateToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is missing");
    }

    return jwt.sign(
        { id: user._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );
};

// REGISTER
router.post(
    "/register",
    [
        body("name")
            .isString()
            .trim()
            .isLength({ min: 2, max: 50 })
            .matches(/^[\p{L}\p{M}0-9 .'-]+$/u)
            .withMessage("Enter a valid name"),

        body("email")
            .isString()
            .trim()
            .isEmail()
            .normalizeEmail()
            .withMessage("Enter a valid email"),

        body("password")
            .isString()
            .isLength({ min: 8, max: 72 })
            .withMessage("Password must be 8 to 72 characters")
    ],
    validate,
    async (req, res) => {
        try {
            const { name, email, password } = req.body;

            const existingUser = await User.findOne({ email });

            if (existingUser) {
                return res.status(409).json({
                    message: "Email already registered"
                });
            }

            const hashedPassword = await bcrypt.hash(password, 12);

            const user = await User.create({
                name,
                email,
                password: hashedPassword,
                role: "user"
            });

            const token = generateToken(user);

            return res.status(201).json({
                message: "Registration successful",
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });

        } catch (error) {
            console.error("Registration error:", error.message);

            if (error.code === 11000) {
                return res.status(409).json({
                    message: "Email already registered"
                });
            }

            return res.status(500).json({
                message: "Registration failed"
            });
        }
    }
);

// LOGIN
router.post(
    "/login",
    [
        body("email")
            .isString()
            .trim()
            .isEmail()
            .normalizeEmail()
            .withMessage("Enter a valid email"),

        body("password")
            .isString()
            .notEmpty()
            .isLength({ max: 72 })
            .withMessage("Invalid password")
    ],
    validate,
    async (req, res) => {
        try {
            const { email, password } = req.body;

            const user = await User.findOne({ email })
                .select("+password");

            if (
                !user ||
                !(await bcrypt.compare(password, user.password))
            ) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const token = generateToken(user);

            return res.json({
                message: "Login successful",
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });

        } catch (error) {
            console.error("Login error:", error.message);

            return res.status(500).json({
                message: "Login failed"
            });
        }
    }
);

// GET OWN PROFILE
router.get("/me", protect, (req, res) => {
    return res.json({
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            createdAt: req.user.createdAt
        }
    });
});

module.exports = router;