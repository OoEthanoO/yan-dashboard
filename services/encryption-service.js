import CryptoJS from "crypto-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Get the encryption key from environment or secure storage
// In a production environment, you'd use a more sophisticated key management system
const AI_PUBLIC_KEY = "AI_MODEL_PUBLIC_KEY_2023";

// Create a namespace for encrypted data storage to clearly mark which data is encrypted
const ENCRYPTION_NAMESPACE = "encrypted_";

export const EncryptionService = {
  // Get device-specific encryption salt to add additional security
  getDeviceSalt: async () => {
    let salt = await AsyncStorage.getItem("device_encryption_salt");
    if (!salt) {
      // Generate a unique salt for this device
      salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
      await AsyncStorage.setItem("device_encryption_salt", salt);
    }
    return salt;
  },

  // Encrypt grade data for sending to the server
  encryptGradeData: async (data) => {
    if (data === null || data === undefined) return data;

    try {
      const deviceSalt = await EncryptionService.getDeviceSalt();
      const combinedKey = `${AI_PUBLIC_KEY}_${deviceSalt}`;

      const stringData = JSON.stringify(data);
      return CryptoJS.AES.encrypt(stringData, combinedKey).toString();
    } catch (error) {
      console.error("Encryption error:", error);
      // Return a placeholder to indicate encryption error
      return null;
    }
  },

  // Decrypt grade data (only used locally for display)
  decryptGradeData: async (encryptedData) => {
    if (!encryptedData) return null;

    try {
      const deviceSalt = await EncryptionService.getDeviceSalt();
      const combinedKey = `${AI_PUBLIC_KEY}_${deviceSalt}`;

      const bytes = CryptoJS.AES.decrypt(encryptedData, combinedKey);
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (error) {
      console.error("Decryption error:", error);
      return null;
    }
  },

  // Process assignments to encrypt grade data
  processAssignmentsForSync: async (assignments) => {
    if (!assignments || !Array.isArray(assignments)) return assignments;

    const processedAssignments = [];

    for (const assignment of assignments) {
      if (
        assignment &&
        assignment.grade !== undefined &&
        assignment.grade !== null
      ) {
        const encryptedGrade = await EncryptionService.encryptGradeData(
          assignment.grade
        );

        processedAssignments.push({
          ...assignment,
          grade: encryptedGrade,
          isGradeEncrypted: true,
        });
      } else {
        processedAssignments.push(assignment);
      }
    }

    return processedAssignments;
  },

  // Process courses to encrypt grade data
  processCoursesForSync: async (courses) => {
    if (!courses || !Array.isArray(courses)) return courses;

    const processedCourses = [];

    for (const course of courses) {
      if (!course) {
        processedCourses.push(course);
        continue;
      }

      const processedCourse = { ...course };

      // Encrypt course grade
      if (course.grade !== undefined && course.grade !== null) {
        processedCourse.grade = await EncryptionService.encryptGradeData(
          course.grade
        );
        processedCourse.isGradeEncrypted = true;
      }

      // Encrypt grade history
      if (
        course.gradeHistory &&
        Array.isArray(course.gradeHistory) &&
        course.gradeHistory.length > 0
      ) {
        const encryptedHistory = [];

        for (const point of course.gradeHistory) {
          if (point && point.grade !== undefined && point.grade !== null) {
            encryptedHistory.push({
              date: point.date,
              grade: await EncryptionService.encryptGradeData(point.grade),
              isEncrypted: true,
            });
          } else {
            encryptedHistory.push(point);
          }
        }

        processedCourse.gradeHistory = encryptedHistory;
      }

      processedCourses.push(processedCourse);
    }

    return processedCourses;
  },

  // Function to decrypt assignments locally (for display only)
  decryptAssignments: async (encryptedAssignments) => {
    if (!encryptedAssignments || !Array.isArray(encryptedAssignments))
      return encryptedAssignments;

    const decryptedAssignments = [];

    for (const assignment of encryptedAssignments) {
      if (assignment && assignment.isGradeEncrypted && assignment.grade) {
        const decryptedGrade = await EncryptionService.decryptGradeData(
          assignment.grade
        );

        decryptedAssignments.push({
          ...assignment,
          grade: decryptedGrade,
          isGradeEncrypted: false,
        });
      } else {
        decryptedAssignments.push(assignment);
      }
    }

    return decryptedAssignments;
  },

  // Function to decrypt courses locally (for display only)
  decryptCourses: async (encryptedCourses) => {
    if (!encryptedCourses || !Array.isArray(encryptedCourses))
      return encryptedCourses;

    const decryptedCourses = [];

    for (const course of encryptedCourses) {
      if (!course) {
        decryptedCourses.push(course);
        continue;
      }

      const decryptedCourse = { ...course };

      // Decrypt course grade
      if (course.isGradeEncrypted && course.grade) {
        decryptedCourse.grade = await EncryptionService.decryptGradeData(
          course.grade
        );
        decryptedCourse.isGradeEncrypted = false;
      }

      // Decrypt grade history
      if (course.gradeHistory && Array.isArray(course.gradeHistory)) {
        const decryptedHistory = [];

        for (const point of course.gradeHistory) {
          if (point && point.isEncrypted && point.grade) {
            decryptedHistory.push({
              date: point.date,
              grade: await EncryptionService.decryptGradeData(point.grade),
              isEncrypted: false,
            });
          } else {
            decryptedHistory.push(point);
          }
        }

        decryptedCourse.gradeHistory = decryptedHistory;
      }

      decryptedCourses.push(decryptedCourse);
    }

    return decryptedCourses;
  },
};
