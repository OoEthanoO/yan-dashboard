const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const readline = require("readline");

const VersionHistorySchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  type: {
    type: String,
    enum: ["initial", "production", "rc", "beta", "alpha"],
    required: true,
  },
  changes: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

VersionHistorySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

VersionHistorySchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

const VersionHistory =
  mongoose.models.VersionHistory ||
  mongoose.model("VersionHistory", VersionHistorySchema);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected for script");
  } catch (err) {
    console.error("MongoDB script connection error:", err);
    process.exit(1);
  }
}

async function addVersionHistory() {
  console.log("\n--- Add New Version History Entry ---");
  const version = await askQuestion("Version (e.g. 0.1.0): ");
  const date = await askQuestion("Date (YYYY-MM-DD): ");
  const type = await askQuestion(
    "Type (initial, production, rc, beta, alpha): "
  );

  if (!["initial", "production", "rc", "beta", "alpha"].includes(type)) {
    console.log(
      "Invalid type. Please use one of: initial, production, rc, beta, alpha"
    );
    return;
  }

  console.log("\nChanges (enter one per line, empty line to finish):");
  const changes = [];
  let change = await askQuestion("> ");

  while (change.trim() !== "") {
    changes.push(change);
    change = await askQuestion("> ");
  }

  try {
    const newVersionHistory = new VersionHistory({
      version,
      date,
      type,
      changes,
    });
    await newVersionHistory.save();
    console.log(
      "Version history entry added successfully:",
      newVersionHistory._id
    );
  } catch (error) {
    console.error("Error adding version history:", error.message);
  }
}

async function listVersionHistory() {
  console.log("\n--- All Version History Entries ---");
  try {
    const versionEntries = await VersionHistory.find({}).sort({
      createdAt: -1,
    });
    if (versionEntries.length === 0) {
      console.log("No version history entries found.");
      return;
    }
    versionEntries.forEach((entry) => {
      console.log(
        `ID: ${entry._id}\nVersion: ${entry.version}\nDate: ${
          entry.date
        }\nType: ${entry.type}\nChanges: ${entry.changes.join(
          ", "
        )}\nCreated: ${entry.createdAt}\nUpdated: ${entry.updatedAt}\n---`
      );
    });
  } catch (error) {
    console.error("Error listing version history:", error.message);
  }
}

async function updateVersionHistory() {
  console.log("\n--- Update Version History Entry ---");
  const id = await askQuestion("Enter ID of entry to update: ");
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log("Invalid ID format.");
    return;
  }

  try {
    const entry = await VersionHistory.findById(id);
    if (!entry) {
      console.log("Entry not found.");
      return;
    }

    console.log("Current details:", entry.toObject());
    const updates = {};

    const version = await askQuestion(`Version (${entry.version}): `);
    if (version) updates.version = version;

    const date = await askQuestion(`Date (${entry.date}): `);
    if (date) updates.date = date;

    const type = await askQuestion(
      `Type (${entry.type}) (initial, production, rc, beta, alpha): `
    );
    if (type) {
      if (!["initial", "production", "rc", "beta", "alpha"].includes(type)) {
        console.log("Invalid type. Not updated.");
      } else {
        updates.type = type;
      }
    }

    const updateChanges = await askQuestion("Update changes list? (y/n): ");
    if (updateChanges.toLowerCase() === "y") {
      console.log("\nNew changes (enter one per line, empty line to finish):");
      const changes = [];
      let change = await askQuestion("> ");

      while (change.trim() !== "") {
        changes.push(change);
        change = await askQuestion("> ");
      }

      updates.changes = changes;
    }

    if (Object.keys(updates).length === 0) {
      console.log("No changes provided.");
      return;
    }

    const updatedEntry = await VersionHistory.findByIdAndUpdate(id, updates, {
      new: true,
    });
    console.log("Version history entry updated successfully:", updatedEntry);
  } catch (error) {
    console.error("Error updating version history:", error.message);
  }
}

async function deleteVersionHistory() {
  console.log("\n--- Delete Version History Entry ---");
  const id = await askQuestion("Enter ID of entry to delete: ");
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log("Invalid ID format.");
    return;
  }
  try {
    const deletedEntry = await VersionHistory.findByIdAndDelete(id);
    if (!deletedEntry) {
      console.log("Entry not found or already deleted.");
      return;
    }
    console.log("Version history entry deleted successfully:", deletedEntry);
  } catch (error) {
    console.error("Error deleting version history entry:", error.message);
  }
}

async function main() {
  await connectDB();

  let running = true;
  while (running) {
    console.log("\nManage Version History:");
    console.log("1. Add Version History Entry");
    console.log("2. List Version History Entries");
    console.log("3. Update Version History Entry");
    console.log("4. Delete Version History Entry");
    console.log("5. Exit");
    const choice = await askQuestion("Choose an option: ");

    switch (choice) {
      case "1":
        await addVersionHistory();
        break;
      case "2":
        await listVersionHistory();
        break;
      case "3":
        await updateVersionHistory();
        break;
      case "4":
        await deleteVersionHistory();
        break;
      case "5":
        running = false;
        break;
      default:
        console.log("Invalid option. Please try again.");
    }
  }

  rl.close();
  await mongoose.disconnect();
  console.log("MongoDB disconnected.");
}

main().catch(console.error);
