require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/suggestions", async (req, res) => {
  const { assignments, courses, studySessions } = req.body;

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

  const lowGradeCourses = courses
    .filter((c) => c.grade && parseFloat(c.grade) < 90)
    .map((c) => c.name);

  const studyStats = {};
  courses.forEach((course) => {
    const courseStudy = studySessions.filter((s) => s.courseId === course.id);
    studyStats[course.name] = {
      totalMinutes: courseStudy.reduce((sum, s) => sum + s.durationMinutes, 0),
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
- At least 3 suggestions must specifically address the lowest-graded subjects
- Every suggestion must directly reference specific course names or assignment titles shown in the data
- Be specific and actionable - not generic

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
      `${course.name}: ${course.grade || "No grade"} ${
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

  try {
    console.log("Prompt sent to OpenAI:", prompt);
    const completion = await openai.chat.completions.create({
      // model: "o4-mini-2025-04-16",
      model: "gpt-4-0613",
      messages: [
        {
          role: "system",
          content:
            "You are a highly personalized academic productivity assistant analyzing real student data. Your primary focus is improving performance in LOWER-GRADED SUBJECTS.\n\n" +
            "CRITICAL PRIORITIES:\n" +
            "- Dedicate at least 3/5 suggestions to the lowest-graded courses\n" +
            "- Always reference specific course names and assignment titles\n" +
            "- Each suggestion must be under 15 words, formatted with • symbol\n" +
            "- Analyze study patterns and suggest targeted time allocation\n" +
            "- Identify subject-specific weaknesses based on grade patterns\n" +
            "- Never claim data is missing; work with what's provided\n" +
            "- Be ultra-specific and actionable - avoid generic advice\n\n" +
            "Your suggestions should address the student's actual course performance, prioritizing improvement where grades are lowest.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    // const completion = await openai.responses.create({
    //   model: "o4-mini-2025-04-16", // Keep using nano model
    //   // model: "o3-mini-2025-01-31",
    //   reasoning: { effort: "low" },
    //   input: [
    //     // {
    //     //   role: "system",
    //     //   content:
    //     //     "You are a highly personalized academic productivity assistant analyzing real student data. Your primary focus is improving performance in LOWER-GRADED SUBJECTS.\n\n" +
    //     //     "CRITICAL PRIORITIES:\n" +
    //     //     "- Dedicate at least 3/5 suggestions to the lowest-graded courses\n" +
    //     //     "- Always reference specific course names and assignment titles\n" +
    //     //     "- Each suggestion must be under 15 words, formatted with • symbol\n" +
    //     //     "- Analyze study patterns and suggest targeted time allocation\n" +
    //     //     "- Identify subject-specific weaknesses based on grade patterns\n" +
    //     //     "- Never claim data is missing; work with what's provided\n" +
    //     //     "- Be ultra-specific and actionable - avoid generic advice\n\n" +
    //     //     "Your suggestions should address the student's actual course performance, prioritizing improvement where grades are lowest.",
    //     // },
    //     { role: "user", content: prompt },
    //   ],
    //   // max_tokens: 200,
    //   // temperature: 0.7,
    // });

    console.log("OpenAI response:", completion.output_text);

    const suggestions = completion.choices[0].message.content;
    res.json({ suggestions });
  } catch (fallbackErr) {
    res.status(500).json({ error: "AI suggestion failed" });
  }
});

function getCourseName(courseId, courses) {
  const course = courses.find((c) => c.id === courseId);
  return course ? course.name : "Unknown";
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`AI Suggestions server running on port ${PORT}`);
});
