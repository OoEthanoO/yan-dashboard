const CryptoJS = require("crypto-js");
require("dotenv").config();

const AI_PRIVATE_KEY = process.env.AI_PRIVATE_KEY || "AI_MODEL_PUBLIC_KEY_2023";

exports.decryptInSecureEnvironment = async (encryptedData) => {
  if (!encryptedData) {
    return {
      assignments: [],
      courses: [],
      studySessions: [],
    };
  }

  const { assignments = [], courses = [], studySessions = [] } = encryptedData;

  const decryptedAssignments = assignments.map((assignment) => {
    if (assignment && assignment.isGradeEncrypted && assignment.grade) {
      try {
        const bytes = CryptoJS.AES.decrypt(assignment.grade, AI_PRIVATE_KEY);
        const decryptedGrade = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

        return {
          ...assignment,
          grade: decryptedGrade,
          isGradeEncrypted: false,
        };
      } catch (error) {
        console.error("Error decrypting assignment grade:", error);
        return {
          ...assignment,
          grade: null,
          isGradeEncrypted: false,
        };
      }
    }
    return assignment;
  });

  const decryptedCourses = courses.map((course) => {
    if (!course) return course;
    const processedCourse = { ...course };

    if (course.isGradeEncrypted && course.grade) {
      try {
        const bytes = CryptoJS.AES.decrypt(course.grade, AI_PRIVATE_KEY);
        processedCourse.grade = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        processedCourse.isGradeEncrypted = false;
      } catch (error) {
        console.error("Error decrypting course grade:", error);
        processedCourse.grade = null;
        processedCourse.isGradeEncrypted = false;
      }
    }

    if (course.gradeHistory?.length) {
      processedCourse.gradeHistory = course.gradeHistory.map((point) => {
        if (point?.isEncrypted && point.grade) {
          try {
            const bytes = CryptoJS.AES.decrypt(point.grade, AI_PRIVATE_KEY);
            return {
              date: point.date,
              grade: JSON.parse(bytes.toString(CryptoJS.enc.Utf8)),
              isEncrypted: false,
            };
          } catch (error) {
            console.error("Error decrypting grade history point:", error);
            return {
              date: point.date,
              grade: null,
              isEncrypted: false,
            };
          }
        }
        return point;
      });
    }

    return processedCourse;
  });

  return {
    assignments: decryptedAssignments,
    courses: decryptedCourses,
    studySessions,
  };
};

exports.validateDecryptedData = (data) => {
  const { assignments, courses } = data;

  const hasEncryptedAssignments = assignments.some((a) => a?.isGradeEncrypted);

  const hasEncryptedCourses = courses.some((c) => c?.isGradeEncrypted);

  const hasEncryptedHistory = courses.some((c) =>
    c?.gradeHistory?.some((point) => point?.isEncrypted)
  );

  return {
    fullyDecrypted:
      !hasEncryptedAssignments && !hasEncryptedCourses && !hasEncryptedHistory,
    encryptedAssignmentsRemaining: hasEncryptedAssignments,
    encryptedCoursesRemaining: hasEncryptedCourses,
    encryptedHistoryRemaining: hasEncryptedHistory,
  };
};
