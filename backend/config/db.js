// ==========================================
// SECUREAUTH - MONGODB DATABASE CONNECTION
// ==========================================

const mongoose = require("mongoose");

const connectDB = async () => {

    try {

        // Check MongoDB URI
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is missing in .env file");
        }

        // Connect to MongoDB Atlas
        const connection = await mongoose.connect(
            process.env.MONGO_URI,
            {
                serverSelectionTimeoutMS: 10000
            }
        );

        console.log("--------------------------------");
        console.log("MongoDB Connected Successfully");
        console.log("Database:", connection.connection.name);
        console.log("Host:", connection.connection.host);
        console.log("--------------------------------");

        return connection;

    } catch (error) {

        console.error("MongoDB Connection Failed:");
        console.error(error.message);

        throw error;
    }
};

// Export Connection Function
module.exports = connectDB;