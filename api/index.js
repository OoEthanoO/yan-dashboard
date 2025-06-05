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
    lastUpdateTime: { type: Date, default: Date.now },
    role: { type: String, enum: ["user", "admin"], default: "user" },
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

const authenticateAdmin = async (req, res, next) => {
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

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
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
  console.log("req.user", req.user);
  console.log("req.user.role", req.user.role);

  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      lastSync: req.user.lastSync,
      role: req.user.role || "user",
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
      localLastUpdateTime,
    } = req.body;
    const userId = req.user._id;

    const serverLastUpdateTime = req.user.lastUpdateTime
      ? new Date(req.user.lastUpdateTime)
      : new Date(0);

    const clientLastUpdateTime = localLastUpdateTime
      ? new Date(localLastUpdateTime)
      : new Date(0);

    const clientDataIsNewer = clientLastUpdateTime > serverLastUpdateTime;

    console.log(`[SYNC] Client last update: ${clientLastUpdateTime}`);
    console.log(`[SYNC] Server last update: ${serverLastUpdateTime}`);
    console.log(
      `[SYNC] Client data is ${clientDataIsNewer ? "newer" : "older"}`
    );

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
      console.log("[SYNC] Server data is newer, sending server data to client");
    }

    if (clientDataIsNewer || !req.user.lastUpdateTime) {
      req.user.lastSync = new Date();
    }

    await req.user.save();

    console.log("[SYNC] req.user.lastUpdateTime", req.user.lastUpdateTime);

    res.json({
      success: true,
      lastSync: req.user.lastSync,
      serverLastUpdateTime: req.user.lastUpdateTime
        ? req.user.lastUpdateTime.toISOString()
        : new Date().toISOString(),
      data: {
        assignments: (await Assignment.find({ userId })).map((a) => ({
          id: a.syncId,
          title: a.title,
          dueDate: a.dueDate,
          description: a.description,
          courseId: a.courseId,
          grade: a.grade,
          completed: a.completed,
          _serverUpdatedAt: a.updatedAt.toISOString(),
        })),
        courses: (await Course.find({ userId })).map((c) => ({
          id: c.syncId,
          name: c.name,
          grade: c.grade,
          gradeHistory: c.gradeHistory,
          _serverUpdatedAt: c.updatedAt.toISOString(),
        })),
        studySessions: (await StudySession.find({ userId })).map((s) => ({
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
    let { assignments, courses, studySessions, studyPatterns, dateContext } =
      req.body;
    const userId = req.user._id;

    if (!dateContext) {
      const currentDate = new Date();
      dateContext = {
        today: currentDate.toISOString().split("T")[0],
        todayDayName: currentDate.toLocaleDateString("en-US", {
          weekday: "long",
        }),
        todayFormatted: currentDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        timezone: "UTC",
      };
    }

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

    const upcomingAssignments = assignments
      .filter((a) => new Date(a.dueDate) > new Date() && !a.completed)
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

    const urgentAssignments = upcomingAssignments.filter(
      (a) =>
        (new Date(a.dueDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24) <=
        7
    );

    const coursePerformance = courses
      .map((course) => {
        const courseAssignments = assignments.filter(
          (a) => a.courseId === course.id
        );
        const completedAssignments = courseAssignments.filter(
          (a) => a.completed
        );
        const avgGrade = course.grade ? parseFloat(course.grade) : null;
        const studyTime = studySessions
          .filter((s) => s.courseId === course.id)
          .reduce((sum, s) => sum + s.durationMinutes, 0);

        return {
          ...course,
          completionRate:
            completedAssignments.length / courseAssignments.length || 0,
          avgGrade,
          totalStudyTime: studyTime,
          upcomingCount: courseAssignments.filter(
            (a) => new Date(a.dueDate) > new Date() && !a.completed
          ).length,
        };
      })
      .sort((a, b) => {
        const scoreA = (a.avgGrade || 60) - a.upcomingCount * 5;
        const scoreB = (b.avgGrade || 60) - b.upcomingCount * 5;
        return scoreA - scoreB;
      });

    const studyStats = courses.reduce((stats, course) => {
      const courseStudy = studySessions.filter((s) => s.courseId === course.id);
      stats[course.name] = {
        totalMinutes: courseStudy.reduce(
          (sum, s) => sum + s.durationMinutes,
          0
        ),
        sessions: courseStudy.length,
        avgSessionLength:
          courseStudy.length > 0
            ? courseStudy.reduce((sum, s) => sum + s.durationMinutes, 0) /
              courseStudy.length
            : 30,
      };
      return stats;
    }, {});

    const prompt = `
SMART STUDY PLANNING ANALYSIS - Generate a personalized weekly study schedule

CURRENT DATE AND TIME CONTEXT:
• Today is: ${dateContext.todayFormatted}
• Current day of week: ${dateContext.todayDayName}
• Today's date: ${dateContext.today}
• User timezone: ${dateContext.timezone}

IMPORTANT: When creating the weekly schedule, start from TODAY (${
      dateContext.todayDayName
    }) and proceed chronologically through the week. Make sure day names match the actual calendar dates.

CURRENT ACADEMIC STATUS:
${coursePerformance
  .map(
    (course) =>
      `${course.name}: Grade ${course.avgGrade || "Ungraded"} | ${
        course.upcomingCount
      } assignments due | ${Math.round(
        (studyStats[course.name]?.totalMinutes || 0) / 60
      )}h total study time`
  )
  .join("\n")}

URGENT PRIORITIES (Due within 7 days from today - ${dateContext.today}):
${
  urgentAssignments.length > 0
    ? urgentAssignments
        .map((a) => {
          const daysUntilDue = Math.ceil(
            (new Date(a.dueDate).getTime() -
              new Date(dateContext.today).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return `• ${a.title} (${
            courses.find((c) => c.id === a.courseId)?.name
          }) - Due: ${new Date(
            a.dueDate
          ).toLocaleDateString()} (${daysUntilDue} days from today)`;
        })
        .join("\n")
    : "No urgent assignments"
}

UPCOMING ASSIGNMENTS (Next 30 days from today):
${upcomingAssignments
  .slice(0, 10)
  .map((a) => {
    const daysUntilDue = Math.ceil(
      (new Date(a.dueDate).getTime() - new Date(dateContext.today).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return `• ${a.title} (${
      courses.find((c) => c.id === a.courseId)?.name
    }) - Due: ${new Date(
      a.dueDate
    ).toLocaleDateString()} (${daysUntilDue} days from today)`;
  })
  .join("\n")}

STUDY PATTERNS:
• Average session length: ${Math.round(
      studySessions.reduce((sum, s) => sum + s.durationMinutes, 0) /
        studySessions.length || 30
    )} minutes
• Most studied subjects: ${Object.entries(studyStats)
      .sort(([, a], [, b]) => b.totalMinutes - a.totalMinutes)
      .slice(0, 3)
      .map(
        ([subject, stats]) =>
          `${subject} (${Math.round(stats.totalMinutes / 60)}h)`
      )
      .join(", ")}
• Study frequency: ${studySessions.length} sessions in recent period

PERFORMANCE ANALYSIS:
• Highest priority subjects: ${coursePerformance
      .slice(0, 3)
      .map((c) => `${c.name} (Grade: ${c.avgGrade || "N/A"})`)
      .join(", ")}

GENERATE A DETAILED 7-DAY STUDY SCHEDULE starting from TODAY (${
      dateContext.todayDayName
    }, ${dateContext.today}) with the following format:
// ...rest of existing prompt...
`;

    console.log("Smart Study Planning prompt:", prompt);

    try {
      const completion = await openai.chat.completions.create({
        model: "o3-2025-04-16",
        messages: [
          {
            role: "system",
            content: `You are an AI-powered Smart Study Planner that creates highly personalized, data-driven weekly study schedules.

CORE OBJECTIVES:
- Analyze REAL student performance data to identify priority areas
- Generate actionable 7-day study schedules with specific time blocks
- Prioritize struggling subjects (lower grades) and urgent assignments
- Create realistic, sustainable study patterns based on historical data
- Provide specific course names, assignment titles, and time allocations

RESPONSE FORMAT REQUIREMENTS:
- Use markdown formatting for structure and readability
- Include emojis for visual appeal and section separation
- Provide specific daily time slots (Morning/Afternoon/Evening)
- Include priority levels (HIGH/MEDIUM/LOW) for each study block
- Reference actual course names and assignment titles from the data
- Base recommendations on ACTUAL study patterns, not generic advice

Focus on courses with lower grades and upcoming deadlines. Be specific and actionable.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      console.log("OpenAI Smart Study Planning response:", completion);

      const aiGeneratedPlan = completion.choices[0].message.content;

      const enhancedPlan = `${aiGeneratedPlan}

---

**🎯 QUICK ACTION ITEMS:**
• Start with ${
        urgentAssignments.length > 0
          ? urgentAssignments[0].title
          : "your most challenging subject"
      }
• Focus ${Math.ceil(
        calculateRecommendedHours(upcomingAssignments, coursePerformance) / 7
      )} hours per day this week
• Review lowest-performing subjects: ${coursePerformance
        .slice(0, 2)
        .map((c) => c.name)
        .join(", ")}

**📊 THIS WEEK'S PRIORITIES:**
${coursePerformance
  .slice(0, 3)
  .map(
    (course) =>
      `• ${course.name}: ${Math.ceil(
        course.upcomingCount * 2 + (80 - (course.avgGrade || 70)) / 10
      )} hours recommended`
  )
  .join("\n")}
`;

      res.json({
        suggestions: enhancedPlan,
        metadata: {
          currentDate: dateContext,
          totalUpcoming: upcomingAssignments.length,
          urgentCount: urgentAssignments.length,
          priorityCourses: coursePerformance.slice(0, 3).map((c) => c.name),
          recommendedStudyHours: calculateRecommendedHours(
            upcomingAssignments,
            coursePerformance
          ),
          generatedBy: "OpenAI o3",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError);

      const fallbackPlan = generateDetailedStudyPlan(
        upcomingAssignments,
        coursePerformance,
        studyStats,
        urgentAssignments,
        dateContext
      );

      res.json({
        suggestions: `⚠️ **AI Study Planner Unavailable - Using Structured Fallback**\n\n${fallbackPlan}\n\n*Note: This is a structured backup plan. AI-generated personalized schedules will be available when the service is restored.*`,
        metadata: {
          currentDate: dateContext,
          totalUpcoming: upcomingAssignments.length,
          urgentCount: urgentAssignments.length,
          priorityCourses: coursePerformance.slice(0, 3).map((c) => c.name),
          recommendedStudyHours: calculateRecommendedHours(
            upcomingAssignments,
            coursePerformance
          ),
          generatedBy: "Fallback System",
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (err) {
    console.error("Smart Study Planning error:", err);
    res.status(500).json({ error: "Study planning failed" });
  }
});

function generateDetailedStudyPlan(
  upcomingAssignments,
  coursePerformance,
  studyStats,
  urgentAssignments,
  dateContext
) {
  const currentDate = new Date(dateContext?.today || new Date());
  const days = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() + i);
    days.push({
      name: date.toLocaleDateString("en-US", { weekday: "long" }),
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      fullDate: date.toISOString().split("T")[0],
    });
  }
  const timeSlots = ["Morning (9-12)", "Afternoon (2-5)", "Evening (7-9)"];

  let plan = "📅 **PERSONALIZED 7-DAY STUDY SCHEDULE**\n\n";
  plan += `*Starting from ${dateContext?.todayFormatted || "today"}*\n\n`;

  const totalUpcoming = upcomingAssignments.length;
  const priorityCourses = coursePerformance.slice(0, 3);

  days.forEach((day, dayIndex) => {
    plan += `**${day.toUpperCase()}**\n`;

    timeSlots.forEach((slot, slotIndex) => {
      const assignment = upcomingAssignments[dayIndex * 3 + slotIndex];
      const course = priorityCourses[slotIndex % priorityCourses.length];

      if (assignment || course) {
        const isUrgent = urgentAssignments.some(
          (ua) => ua.id === assignment?.id
        );
        const priority = isUrgent
          ? "HIGH"
          : course?.avgGrade < 80
          ? "MEDIUM"
          : "LOW";
        const duration = Math.max(
          30,
          Math.min(120, studyStats[course?.name]?.avgSessionLength || 60)
        );

        plan += `${slot}: `;

        if (assignment) {
          plan += `📝 ${assignment.title} (${
            course?.name || "Course"
          }) - ${duration}min [${priority}]\n`;
        } else if (course) {
          plan += `📚 ${course.name} Review & Practice - ${duration}min [${priority}]\n`;
        }
      } else {
        plan += `${slot}: 🔄 Flexible study time / Review previous topics\n`;
      }
    });

    plan += `💡 Daily Focus: ${
      priorityCourses[dayIndex % priorityCourses.length]?.name ||
      "General Review"
    }\n\n`;
  });

  plan += "**📊 WEEKLY TARGETS:**\n";
  priorityCourses.forEach((course) => {
    const recommendedHours = Math.ceil(
      course.upcomingCount * 2 + (80 - (course.avgGrade || 70)) / 10
    );
    plan += `• ${course.name}: ${recommendedHours} hours this week\n`;
  });

  return plan;
}

function calculateRecommendedHours(assignments, coursePerformance) {
  return coursePerformance.reduce((total, course) => {
    return (
      total +
      Math.ceil(course.upcomingCount * 2 + (80 - (course.avgGrade || 70)) / 10)
    );
  }, 0);
}

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

app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({}, { password: 0, encryptionKey: 0 }).sort({
      createdAt: -1,
    });
    res.json(users);
  } catch (err) {
    console.error("Admin users fetch error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/api/admin/stats", authenticateAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAssignments = await Assignment.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalStudySessions = await StudySession.countDocuments();
    const totalIssues = await Issue.countDocuments();
    const totalVersions = await VersionHistory.countDocuments();

    res.json({
      totalUsers,
      totalAssignments,
      totalCourses,
      totalStudySessions,
      totalIssues,
      totalVersions,
    });
  } catch (err) {
    console.error("Admin stats fetch error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

app.get("/api/admin/issues", authenticateAdmin, async (req, res) => {
  try {
    const issues = await Issue.find({}).sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    console.error("Admin issues fetch error:", err);
    res.status(500).json({ error: "Failed to fetch issues" });
  }
});

app.post("/api/admin/issues", authenticateAdmin, async (req, res) => {
  try {
    const { title, description, type, priority, status } = req.body;
    const issue = new Issue({ title, description, type, priority, status });
    await issue.save();
    res.status(201).json(issue);
  } catch (err) {
    console.error("Admin issue creation error:", err);
    res.status(500).json({ error: "Failed to create issue" });
  }
});

app.put("/api/admin/issues/:id", authenticateAdmin, async (req, res) => {
  try {
    const issue = await Issue.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!issue) {
      return res.status(404).json({ error: "Issue not found" });
    }
    res.json(issue);
  } catch (err) {
    console.error("Admin issue update error:", err);
    res.status(500).json({ error: "Failed to update issue" });
  }
});

app.delete("/api/admin/issues/:id", authenticateAdmin, async (req, res) => {
  try {
    const issue = await Issue.findByIdAndDelete(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: "Issue not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Admin issue deletion error:", err);
    res.status(500).json({ error: "Failed to delete issue" });
  }
});

app.get("/api/admin/version-history", authenticateAdmin, async (req, res) => {
  try {
    const versions = await VersionHistory.find({}).sort({ createdAt: -1 });
    res.json(versions);
  } catch (err) {
    console.error("Admin version history fetch error:", err);
    res.status(500).json({ error: "Failed to fetch version history" });
  }
});

app.post("/api/admin/version-history", authenticateAdmin, async (req, res) => {
  try {
    const { version, date, type, changes } = req.body;
    const versionHistory = new VersionHistory({ version, date, type, changes });
    await versionHistory.save();
    res.status(201).json(versionHistory);
  } catch (err) {
    console.error("Admin version history creation error:", err);
    res.status(500).json({ error: "Failed to create version history" });
  }
});

app.put(
  "/api/admin/version-history/:id",
  authenticateAdmin,
  async (req, res) => {
    try {
      const versionHistory = await VersionHistory.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!versionHistory) {
        return res.status(404).json({ error: "Version history not found" });
      }
      res.json(versionHistory);
    } catch (err) {
      console.error("Admin version history update error:", err);
      res.status(500).json({ error: "Failed to update version history" });
    }
  }
);

app.delete(
  "/api/admin/version-history/:id",
  authenticateAdmin,
  async (req, res) => {
    try {
      const versionHistory = await VersionHistory.findByIdAndDelete(
        req.params.id
      );
      if (!versionHistory) {
        return res.status(404).json({ error: "Version history not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Admin version history deletion error:", err);
      res.status(500).json({ error: "Failed to delete version history" });
    }
  }
);

function getCourseName(courseId, courses) {
  const course = courses.find((c) => c.id === courseId);
  return course ? course.name : "Unknown";
}

module.exports = app;
