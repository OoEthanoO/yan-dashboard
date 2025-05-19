require("dotenv").config();
const mongoose = require("mongoose");

async function testConnection() {
  try {
    const uri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/yan-dashboard";
    console.log("Attempting to connect to MongoDB...");

    await mongoose.connect(uri);
    console.log("✅ Successfully connected to MongoDB!");

    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log("Available collections:");
    collections.forEach((collection) => console.log(`- ${collection.name}`));

    await mongoose.disconnect();
    console.log("Connection closed.");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  }
}

testConnection();
