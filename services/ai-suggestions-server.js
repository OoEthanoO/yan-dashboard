require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("user-agent") || "Unknown";

  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip} - ${userAgent}`);

  const startTime = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(
      `[${timestamp}] ${method} ${url} - Status: ${res.statusCode} - Duration: ${duration}ms`
    );
  });

  next();
});

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    encryptionKey: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastSync: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const AssignmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    dueDate: { type: String, required: true },
    description: { type: String },
    courseId: { type: String, required: true },
    grade: { type: String },
    completed: { type: Boolean, default: false },
    syncId: { type: String, required: true },
  },
  { timestamps: true }
);

const CourseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    grade: { type: String },
    gradeHistory: [
      {
        date: String,
        grade: String,
      },
    ],
    syncId: { type: String, required: true },
  },
  { timestamps: true }
);

const StudySessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: { type: String, required: true },
    date: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    notes: { type: String },
    syncId: { type: String, required: true },
  },
  { timestamps: true }
);

const IssueSchema = new mongoose.Schema({
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
});

IssueSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

IssueSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

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

const Issue = mongoose.model("Issue", IssueSchema);

const User = mongoose.model("User", UserSchema);
const Assignment = mongoose.model("Assignment", AssignmentSchema);
const Course = mongoose.model("Course", CourseSchema);
const StudySession = mongoose.model("StudySession", StudySessionSchema);

const VersionHistory =
  mongoose.models.VersionHistory ||
  mongoose.model("VersionHistory", VersionHistorySchema);

const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_jwt_secret"
    );
    const user = await User.findById(decoded._id);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      email,
      password: hashedPassword,
      name,
    });

    await user.save();

    const token = jwt.sign(
      { _id: user._id },
      process.env.JWT_SECRET || "default_jwt_secret",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { _id: user._id },
      process.env.JWT_SECRET || "default_jwt_secret",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      lastSync: req.user.lastSync,
    },
  });
});

app.post("/api/sync", authenticate, async (req, res) => {
  try {
    const {
      assignments,
      courses,
      studySessions,
      lastSyncTime,
      deletedAssignmentIds,
      globalLastModified,
    } = req.body;
    const userId = req.user._id;
    const clientLastSync = new Date(lastSyncTime || 0);
    const serverLastSync = req.user.lastSync;

    const clientDataIsNewer =
      globalLastModified &&
      new Date(globalLastModified) > new Date(serverLastSync);

    if (
      deletedAssignmentIds &&
      Array.isArray(deletedAssignmentIds) &&
      deletedAssignmentIds.length > 0
    ) {
      for (const id of deletedAssignmentIds) {
        await Assignment.findOneAndDelete({ userId, syncId: id });
      }
    }

    if (clientDataIsNewer) {
      console.log("[SYNC] Client data is newer, updating server data");

      if (assignments && Array.isArray(assignments)) {
        for (const assignment of assignments) {
          await Assignment.findOneAndUpdate(
            { userId, syncId: assignment.id },
            {
              userId,
              title: assignment.title,
              dueDate: assignment.dueDate,
              description: assignment.description || "",
              courseId: assignment.courseId,
              grade: assignment.grade,
              completed: assignment.completed || false,
              syncId: assignment.id,
            },
            { upsert: true, new: true }
          );
        }
      }

      if (courses && Array.isArray(courses)) {
        for (const course of courses) {
          await Course.findOneAndUpdate(
            { userId, syncId: course.id },
            {
              userId,
              name: course.name,
              grade: course.grade,
              gradeHistory: course.gradeHistory || [],
              syncId: course.id,
            },
            { upsert: true, new: true }
          );
        }
      }

      if (studySessions && Array.isArray(studySessions)) {
        for (const session of studySessions) {
          await StudySession.findOneAndUpdate(
            { userId, syncId: session.id },
            {
              userId,
              courseId: session.courseId,
              date: session.date,
              durationMinutes: session.durationMinutes,
              notes: session.notes || "",
              syncId: session.id,
            },
            { upsert: true, new: true }
          );
        }
      }
    } else {
      console.log("[SYNC] Server data is newer, skipping client updates");
    }

    const updatedAssignments = await Assignment.find({
      userId,
    });

    const updatedCourses = await Course.find({
      userId,
    });

    const updatedStudySessions = await StudySession.find({
      userId,
    });

    req.user.lastSync = new Date();
    await req.user.save();

    res.json({
      success: true,
      lastSync: req.user.lastSync,
      data: {
        assignments: updatedAssignments.map((a) => ({
          id: a.syncId,
          title: a.title,
          dueDate: a.dueDate,
          description: a.description,
          courseId: a.courseId,
          grade: a.grade,
          completed: a.completed,
          _serverUpdatedAt: a.updatedAt.toISOString(),
        })),
        courses: updatedCourses.map((c) => ({
          id: c.syncId,
          name: c.name,
          grade: c.grade,
          gradeHistory: c.gradeHistory,
          _serverUpdatedAt: c.updatedAt.toISOString(),
        })),
        studySessions: updatedStudySessions.map((s) => ({
          id: s.syncId,
          courseId: s.courseId,
          date: s.date,
          durationMinutes: s.durationMinutes,
          notes: s.notes,
          _serverUpdatedAt: s.updatedAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ error: "Sync failed" });
  }
});

app.post("/api/auth/update", authenticate, async (req, res) => {
  try {
    const { name } = req.body;

    if (name) {
      req.user.name = name;
    }

    await req.user.save();

    res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
      },
    });
  } catch (err) {
    console.error("User update error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.get("/api/data", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    const assignments = await Assignment.find({ userId });
    const courses = await Course.find({ userId });
    const studySessions = await StudySession.find({ userId });

    res.json({
      assignments: assignments.map((a) => ({
        id: a.syncId,
        title: a.title,
        dueDate: a.dueDate,
        description: a.description,
        courseId: a.courseId,
        grade: a.grade,
        completed: a.completed,
        isGradeEncrypted:
          a.grade && typeof a.grade === "string" && a.grade.length > 3,
      })),
      courses: courses.map((c) => ({
        id: c.syncId,
        name: c.name,
        grade: c.grade,
        isGradeEncrypted:
          c.grade && typeof c.grade === "string" && c.grade.length > 3,
        gradeHistory:
          c.gradeHistory?.map((point) => ({
            date: point.date,
            grade: point.grade,
            isEncrypted:
              point.grade &&
              typeof point.grade === "string" &&
              point.grade.length > 3,
          })) || [],
      })),
      studySessions: studySessions.map((s) => ({
        id: s.syncId,
        courseId: s.courseId,
        date: s.date,
        durationMinutes: s.durationMinutes,
        notes: s.notes,
      })),
    });
  } catch (err) {
    console.error("Data fetch error:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.post("/api/suggestions", authenticate, async (req, res) => {
  try {
    let { assignments, courses, studySessions } = req.body;
    const userId = req.user._id;

    if (!assignments || !courses || !studySessions) {
      assignments = await Assignment.find({ userId });
      courses = await Course.find({ userId });
      studySessions = await StudySession.find({ userId });

      assignments = assignments.map((a) => ({
        id: a.syncId,
        title: a.title,
        dueDate: a.dueDate,
        description: a.description,
        courseId: a.courseId,
        grade: a.grade,
        completed: a.completed,
      }));

      courses = courses.map((c) => ({
        id: c.syncId,
        name: c.name,
        grade: c.grade,
        gradeHistory: c.gradeHistory,
      }));

      studySessions = studySessions.map((s) => ({
        id: s.syncId,
        courseId: s.courseId,
        date: s.date,
        durationMinutes: s.durationMinutes,
        notes: s.notes,
      }));
    }

    const cleanedAssignments = assignments.map((assignment) => {
      const now = new Date();
      const dueDate = new Date(assignment.dueDate);

      if (dueDate > now && !assignment.completed) {
        const { grade, ...restOfAssignment } = assignment;
        return restOfAssignment;
      }
      return assignment;
    });

    const upcomingAssignments = cleanedAssignments
      .filter((a) => new Date(a.dueDate) > new Date())
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

    const studyStats = {};
    courses.forEach((course) => {
      const courseStudy = studySessions.filter((s) => s.courseId === course.id);
      studyStats[course.name] = {
        totalMinutes: courseStudy.reduce(
          (sum, s) => sum + s.durationMinutes,
          0
        ),
        sessions: courseStudy.length,
      };
    });

    const prompt = `
You are looking at REAL student data that has already been provided below. DO NOT ask for more data.
Your task is to analyze this SPECIFIC student data and provide 5 VERY SHORT, personalized productivity suggestions.

IMPORTANT INSTRUCTIONS:
- The data below is REAL and COMPLETE - do not say data is missing or needs to be uploaded
- EACH suggestion must be under 15 words maximum
- Format as bullet points with • symbol
- Analyze subject/course patterns across assignments to identify subject-specific trends
- PRIORITIZE courses with the LOWEST GRADES - give them more detailed attention
- Every suggestion must directly reference specific course names or assignment titles shown in the data
- Be specific and actionable - not generic
- Suggest targeted time allocation based on study patterns
- Identify subject-specific weaknesses based on grade patterns
- Do not make assumptions about the content of the courses or assignments unless descriptions are provided

KEY DATA INSIGHTS:
${
  upcomingAssignments.length > 0
    ? `Next deadline: ${upcomingAssignments[0].title} for ${getCourseName(
        upcomingAssignments[0].courseId,
        courses
      )} on ${upcomingAssignments[0].dueDate}`
    : "No upcoming assignments"
}

COURSES BY PRIORITY (LOWEST GRADES FIRST):
${courses
  .sort((a, b) => {
    const gradeA = a.grade ? parseFloat(a.grade) : 100;
    const gradeB = b.grade ? parseFloat(b.grade) : 100;
    return gradeA - gradeB;
  })
  .map(
    (course) =>
      `${course.name}: ${
        course.grade !== undefined ? course.grade : "No grade"
      } ${
        course.grade && parseFloat(course.grade) < 80
          ? "⚠️ CRITICAL - NEEDS FOCUS"
          : course.grade && parseFloat(course.grade) < 90
          ? "⚠️ NEEDS IMPROVEMENT"
          : ""
      }`
  )
  .join("\n")}

STUDY PATTERNS BY SUBJECT:
${Object.entries(studyStats)
  .map(
    ([course, stats]) =>
      `${course}: ${stats.totalMinutes} minutes across ${stats.sessions} sessions`
  )
  .join("\n")}

SUBJECT-ASSIGNMENT DETAILS:
${courses
  .map((course) => {
    const courseAssignments = cleanedAssignments.filter(
      (a) => a.courseId === course.id
    );
    const completedAssignments = courseAssignments.filter((a) => a.completed);
    const upcomingAssignments = courseAssignments.filter(
      (a) => new Date(a.dueDate) > new Date() && !a.completed
    );

    let result = `${course.name} (${course.grade || "No grade"}): ${
      courseAssignments.length
    } assignments, ${completedAssignments.length} completed`;

    if (upcomingAssignments.length > 0) {
      result += `\n Upcoming assignments: ${upcomingAssignments
        .map((a) => a.title)
        .join(", ")}`;
    }

    return result;
  })
  .join("\n")}

BASED ON THE ABOVE REAL DATA, provide 5 specific, personalized productivity suggestions that reference actual course names and assignments.
`;

    console.log("AI suggestions prompt:", prompt);

    // const completion = await openai.chat.completions.create({
    //   // model: "gpt-4-0613",
    //   model: "o3-2025-04-16",
    //   messages: [
    //     {
    //       role: "system",
    //       content:
    //         "You are a highly personalized academic productivity assistant analyzing real student data. Your primary focus is improving performance in LOWER-GRADED SUBJECTS.\n\n" +
    //         "CRITICAL PRIORITIES:\n" +
    //         // "- Dedicate at least 3/5 suggestions to the lowest-graded courses\n" +
    //         "- Always reference specific course names and assignment titles\n" +
    //         "- Each suggestion must be under 15 words, formatted with • symbol\n" +
    //         "- Analyze study patterns and suggest targeted time allocation\n" +
    //         "- Identify subject-specific weaknesses based on grade patterns\n" +
    //         "- Never claim data is missing; work with what's provided\n" +
    //         "- Be ultra-specific and actionable - avoid generic advice\n\n" +
    //         "Your suggestions should address the student's actual course performance, prioritizing improvement where grades are lowest.",
    //     },
    //     { role: "user", content: prompt },
    //   ],
    //   // max_tokens: 200,
    //   // max_completion_tokens: 200,
    //   // temperature: 0.7,
    // });

    // console.log("AI suggestions response:", completion);

    // const suggestions = completion.choices[0].message.content;
    const suggestions =
      "This would be a paid feature that will be available soon.";
    res.json({ suggestions });
  } catch (err) {
    console.error("AI suggestions error:", err);
    res.status(500).json({ error: "AI suggestion failed" });
  }
});

app.post("/api/assignments", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const assignmentData = req.body;

    const syncId = new mongoose.Types.ObjectId().toString();

    const assignment = new Assignment({
      userId,
      title: assignmentData.title,
      dueDate: assignmentData.dueDate,
      description: assignmentData.description || "",
      courseId: assignmentData.courseId,
      grade: assignmentData.grade,
      isGradeEncrypted: assignmentData.isGradeEncrypted || false,
      completed: assignmentData.completed || false,
      syncId,
    });

    await assignment.save();

    res.status(201).json({
      id: syncId,
      title: assignment.title,
      dueDate: assignment.dueDate,
      description: assignment.description,
      courseId: assignment.courseId,
      grade: assignment.grade,
      isGradeEncrypted: assignment.isGradeEncrypted,
      completed: assignment.completed,
    });
  } catch (err) {
    console.error("Create assignment error:", err);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

app.put("/api/assignments/:id", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const syncId = req.params.id;
    const updatedData = req.body;

    const assignment = await Assignment.findOneAndUpdate(
      { userId, syncId },
      updatedData,
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json({
      id: assignment.syncId,
      title: assignment.title,
      dueDate: assignment.dueDate,
      description: assignment.description,
      courseId: assignment.courseId,
      grade: assignment.grade,
      completed: assignment.completed,
    });
  } catch (err) {
    console.error("Update assignment error:", err);
    res.status(500).json({ error: "Failed to update assignment" });
  }
});

app.delete("/api/assignments/:id", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const syncId = req.params.id;

    const assignment = await Assignment.findOneAndDelete({ userId, syncId });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete assignment error:", err);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

app.post("/api/courses", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const courseData = req.body;

    const syncId = new mongoose.Types.ObjectId().toString();

    const course = new Course({
      userId,
      name: courseData.name,
      grade: courseData.grade,
      isGradeEncrypted: courseData.isGradeEncrypted || false,
      gradeHistory: courseData.gradeHistory || [],
      syncId,
    });

    await course.save();

    res.status(201).json({
      id: syncId,
      name: course.name,
      grade: course.grade,
      isGradeEncrypted: course.isGradeEncrypted,
      gradeHistory: course.gradeHistory,
    });
  } catch (err) {
    console.error("Create course error:", err);
    res.status(500).json({ error: "Failed to create course" });
  }
});

app.put("/api/courses/:id", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const syncId = req.params.id;
    const updatedData = req.body;

    const course = await Course.findOneAndUpdate(
      { userId, syncId },
      updatedData,
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json({
      id: course.syncId,
      name: course.name,
      grade: course.grade,
      gradeHistory: course.gradeHistory,
    });
  } catch (err) {
    console.error("Update course error:", err);
    res.status(500).json({ error: "Failed to update course" });
  }
});

app.delete("/api/courses/:id", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const syncId = req.params.id;

    const course = await Course.findOneAndDelete({ userId, syncId });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    await Assignment.deleteMany({ userId, courseId: syncId });

    await StudySession.deleteMany({ userId, courseId: syncId });

    res.json({ success: true });
  } catch (err) {
    console.error("Delete course error:", err);
    res.status(500).json({ error: "Failed to delete course" });
  }
});

app.post("/api/study-sessions", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const sessionData = req.body;

    const syncId = new mongoose.Types.ObjectId().toString();

    const studySession = new StudySession({
      userId,
      courseId: sessionData.courseId,
      date: sessionData.date,
      durationMinutes: sessionData.durationMinutes,
      notes: sessionData.notes || "",
      syncId,
    });

    await studySession.save();

    res.status(201).json({
      id: syncId,
      courseId: studySession.courseId,
      date: studySession.date,
      durationMinutes: studySession.durationMinutes,
      notes: studySession.notes,
    });
  } catch (err) {
    console.error("Create study session error:", err);
    res.status(500).json({ error: "Failed to create study session" });
  }
});

app.delete("/api/study-sessions/:id", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const syncId = req.params.id;

    const studySession = await StudySession.findOneAndDelete({
      userId,
      syncId,
    });

    if (!studySession) {
      return res.status(404).json({ error: "Study session not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete study session error:", err);
    res.status(500).json({ error: "Failed to delete study session" });
  }
});

app.post("/api/auth/encryption-key", authenticate, async (req, res) => {
  try {
    const { encryptedKey } = req.body;

    if (!encryptedKey) {
      return res.status(400).json({ error: "Encryption key is required" });
    }

    req.user.encryptionKey = encryptedKey;
    await req.user.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Encryption key update error:", err);
    res.status(500).json({ error: "Failed to update encryption key" });
  }
});

app.get("/api/auth/encryption-key", authenticate, async (req, res) => {
  try {
    res.json({
      encryptedKey: req.user.encryptionKey || null,
    });
  } catch (err) {
    console.error("Encryption key retrieval error:", err);
    res.status(500).json({ error: "Failed to retrieve encryption key" });
  }
});

app.get("/api/issues", authenticate, async (req, res) => {
  try {
    const allDbIssues = await Issue.find({}).sort({ createdAt: -1 });

    const issues = allDbIssues
      .filter((item) => item.type === "bug")
      .map((item) => ({
        id: item._id.toString(),
        title: item.title,
        description: item.description,
        status: item.status,
        priority: item.priority,
        type: item.type,
      }));

    const features = allDbIssues
      .filter((item) => item.type === "feature" || item.type === "improvement")
      .map((item) => ({
        id: item._id.toString(),
        title: item.title,
        description: item.description,
        status: item.status,
        priority: item.priority,
        type: item.type,
      }));

    res.json({
      issues,
      features,
    });
  } catch (err) {
    console.error("Issues fetch error:", err);
    res.status(500).json({ error: "Failed to fetch issues data" });
  }
});

app.get("/api/version-history", async (req, res) => {
  try {
    const versionHistory = await VersionHistory.find().sort({ createdAt: -1 });
    res.json({ success: true, versionHistory });
  } catch (error) {
    console.error("Error fetching version history:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch version history" });
  }
});

function getCourseName(courseId, courses) {
  const course = courses.find((c) => c.id === courseId);
  return course ? course.name : "Unknown";
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
