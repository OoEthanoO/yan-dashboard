const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const readline = require("readline");

const issueSchemaDefinition = {
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ["open", "in-progress", "resolved"],
    default: "open",
    required: true,
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
    required: true,
  },
  type: {
    type: String,
    enum: ["bug", "feature", "improvement"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
};

const IssueSchema = new mongoose.Schema(issueSchemaDefinition);
IssueSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});
IssueSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

const Issue = mongoose.models.Issue || mongoose.model("Issue", IssueSchema);

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

async function addIssue() {
  console.log("\n--- Add New Issue ---");
  const title = await askQuestion("Title: ");
  const description = await askQuestion("Description: ");
  const type = await askQuestion("Type (bug, feature, improvement): ");
  const priority = await askQuestion("Priority (low, medium, high): ");
  const status = await askQuestion("Status (open, in-progress, resolved): ");

  if (!["bug", "feature", "improvement"].includes(type)) {
    console.log("Invalid type.");
    return;
  }
  if (!["low", "medium", "high"].includes(priority)) {
    console.log("Invalid priority.");
    return;
  }
  if (!["open", "in-progress", "resolved"].includes(status)) {
    console.log("Invalid status.");
    return;
  }

  try {
    const newIssue = new Issue({ title, description, type, priority, status });
    await newIssue.save();
    console.log("Issue added successfully:", newIssue._id);
  } catch (error) {
    console.error("Error adding issue:", error.message);
  }
}

async function listIssues() {
  console.log("\n--- All Issues ---");
  try {
    const issues = await Issue.find({}).sort({ createdAt: -1 });
    if (issues.length === 0) {
      console.log("No issues found.");
      return;
    }
    issues.forEach((issue) => {
      console.log(
        `ID: ${issue._id}\nTitle: ${issue.title}\nType: ${issue.type}\nPriority: ${issue.priority}\nStatus: ${issue.status}\nDescription: ${issue.description}\nCreated: ${issue.createdAt}\nUpdated: ${issue.updatedAt}\n---`
      );
    });
  } catch (error) {
    console.error("Error listing issues:", error.message);
  }
}

async function updateIssue() {
  console.log("\n--- Update Issue ---");
  const id = await askQuestion("Enter ID of issue to update: ");
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log("Invalid ID format.");
    return;
  }

  try {
    const issue = await Issue.findById(id);
    if (!issue) {
      console.log("Issue not found.");
      return;
    }

    console.log("Current details:", issue.toObject());
    const updates = {};
    const title = await askQuestion(`Title (${issue.title}): `);
    if (title) updates.title = title;
    const description = await askQuestion(
      `Description (${issue.description}): `
    );
    if (description) updates.description = description;
    const type = await askQuestion(
      `Type (${issue.type}) (bug, feature, improvement): `
    );
    if (type) {
      if (!["bug", "feature", "improvement"].includes(type)) {
        console.log("Invalid type. Not updated.");
      } else {
        updates.type = type;
      }
    }
    const priority = await askQuestion(
      `Priority (${issue.priority}) (low, medium, high): `
    );
    if (priority) {
      if (!["low", "medium", "high"].includes(priority)) {
        console.log("Invalid priority. Not updated.");
      } else {
        updates.priority = priority;
      }
    }
    const status = await askQuestion(
      `Status (${issue.status}) (open, in-progress, resolved): `
    );
    if (status) {
      if (!["open", "in-progress", "resolved"].includes(status)) {
        console.log("Invalid status. Not updated.");
      } else {
        updates.status = status;
      }
    }

    if (Object.keys(updates).length === 0) {
      console.log("No changes provided.");
      return;
    }

    const updatedIssue = await Issue.findByIdAndUpdate(id, updates, {
      new: true,
    });
    console.log("Issue updated successfully:", updatedIssue);
  } catch (error) {
    console.error("Error updating issue:", error.message);
  }
}

async function deleteIssue() {
  console.log("\n--- Delete Issue ---");
  const id = await askQuestion("Enter ID of issue to delete: ");
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log("Invalid ID format.");
    return;
  }
  try {
    const deletedIssue = await Issue.findByIdAndDelete(id);
    if (!deletedIssue) {
      console.log("Issue not found or already deleted.");
      return;
    }
    console.log("Issue deleted successfully:", deletedIssue);
  } catch (error) {
    console.error("Error deleting issue:", error.message);
  }
}

async function main() {
  await connectDB();

  let running = true;
  while (running) {
    console.log("\nManage Issues:");
    console.log("1. Add Issue");
    console.log("2. List Issues");
    console.log("3. Update Issue");
    console.log("4. Delete Issue");
    console.log("5. Exit");
    const choice = await askQuestion("Choose an option: ");

    switch (choice) {
      case "1":
        await addIssue();
        break;
      case "2":
        await listIssues();
        break;
      case "3":
        await updateIssue();
        break;
      case "4":
        await deleteIssue();
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
