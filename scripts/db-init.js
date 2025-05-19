require("dotenv").config();
const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");

async function initDatabase() {
  try {
    const uri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/yan-dashboard";
    console.log("Connecting to MongoDB...");

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db();

    const collections = ["users", "assignments", "courses", "studysessions"];
    const existingCollections = await db.listCollections().toArray();
    const existingCollectionNames = existingCollections.map((c) => c.name);

    for (const collection of collections) {
      if (!existingCollectionNames.includes(collection)) {
        console.log(`Creating collection: ${collection}`);
        await db.createCollection(collection);
      } else {
        console.log(`Collection already exists: ${collection}`);
      }
    }

    console.log("Database initialization complete!");
    await client.close();
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}

initDatabase();
