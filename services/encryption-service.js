import AsyncStorage from "@react-native-async-storage/async-storage";
import CryptoJS from "crypto-js";

// Base key used for encryption
const AI_PUBLIC_KEY = "AI_MODEL_PUBLIC_KEY_2023";

// Key for storing user encryption key in AsyncStorage
const USER_ENCRYPTION_KEY = "user_encryption_key";

export const EncryptionService = {
  /**
   * Gets or generates a user-specific encryption key
   * This key will be synchronized across devices via the server
   */
  getUserEncryptionKey: async () => {
    // First try to get from local storage
    let userKey = await AsyncStorage.getItem(USER_ENCRYPTION_KEY);

    if (!userKey) {
      // If no key exists, generate a new one
      userKey = CryptoJS.lib.WordArray.random(256 / 8).toString();
      await AsyncStorage.setItem(USER_ENCRYPTION_KEY, userKey);

      // IMPORTANT: This key should be sent to the server (encrypted with the user's password)
      // to enable multi-device syncing - we'll handle this in a separate function
      await EncryptionService.syncEncryptionKey(userKey);
    }

    return userKey;
  },

  /**
   * Synchronize the encryption key with the server
   */
  syncEncryptionKey: async (userKey) => {
    try {
      // Encrypt the key before sending to server (using password-derived key)
      const passwordHash = await AsyncStorage.getItem("password_hash");
      if (!passwordHash) return;

      const encryptedKey = CryptoJS.AES.encrypt(
        userKey,
        passwordHash
      ).toString();

      // Send to server
      await ApiClient.updateUserEncryptionKey(encryptedKey);
    } catch (error) {
      console.error("Failed to sync encryption key:", error);
    }
  },

  /**
   * Retrieve user encryption key from server
   * (called when logging in on a new device)
   */
  retrieveEncryptionKeyFromServer: async () => {
    try {
      const response = await ApiClient.getUserEncryptionKey();

      if (response?.encryptedKey) {
        const passwordHash = await AsyncStorage.getItem("password_hash");
        if (!passwordHash) return null;

        // Decrypt the key using password hash
        const bytes = CryptoJS.AES.decrypt(response.encryptedKey, passwordHash);
        const userKey = bytes.toString(CryptoJS.enc.Utf8);

        // Save locally
        await AsyncStorage.setItem(USER_ENCRYPTION_KEY, userKey);
        return userKey;
      }
      return null;
    } catch (error) {
      console.error("Failed to retrieve encryption key:", error);
      return null;
    }
  },

  encryptGradeData: async (data) => {
    if (data === null || data === undefined) return data;

    try {
      console.log(`[ENCRYPT] Input grade data: ${data} (type: ${typeof data})`);
      const userKey = await EncryptionService.getUserEncryptionKey();

      const combinedKey = `${AI_PUBLIC_KEY}_${userKey}`;
      console.log(`[ENCRYPT] Using combined key for encryption`);

      const stringData = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(
        stringData,
        combinedKey
      ).toString();
      console.log(`[ENCRYPT] Data encrypted successfully`);

      return encrypted;
    } catch (error) {
      console.error("[ENCRYPT] Encryption error:", error);
      return null;
    }
  },

  decryptGradeData: async (encryptedData) => {
    if (!encryptedData) return null;

    try {
      console.log(`[DECRYPT] Attempting to decrypt data`);
      const userKey = await EncryptionService.getUserEncryptionKey();
      const combinedKey = `${AI_PUBLIC_KEY}_${userKey}`;

      const bytes = CryptoJS.AES.decrypt(encryptedData, combinedKey);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedString) {
        // If decryption fails, we might be on a new device
        console.log(
          "[DECRYPT] Initial decryption failed, trying to retrieve key from server"
        );
        await EncryptionService.retrieveEncryptionKeyFromServer();

        // Try again with the new key
        const newUserKey = await EncryptionService.getUserEncryptionKey();
        const newCombinedKey = `${AI_PUBLIC_KEY}_${newUserKey}`;
        const newBytes = CryptoJS.AES.decrypt(encryptedData, newCombinedKey);
        const newDecryptedString = newBytes.toString(CryptoJS.enc.Utf8);

        if (!newDecryptedString) {
          console.error("[DECRYPT] Failed to decrypt with retrieved key");
          return null;
        }

        return JSON.parse(newDecryptedString);
      }

      return JSON.parse(decryptedString);
    } catch (error) {
      console.error("Decryption error:", error);
      return null;
    }
  },

  processAssignmentsForSync: async (assignments) => {
    if (!assignments || !Array.isArray(assignments)) return assignments;

    const processedAssignments = [];

    for (const assignment of assignments) {
      if (
        assignment &&
        assignment.grade !== undefined &&
        assignment.grade !== null &&
        !assignment.isGradeEncrypted
      ) {
        console.log(
          `[PROCESS] Assignment before encryption: ${
            assignment.title
          }, grade: ${assignment.grade} (type: ${typeof assignment.grade})`
        );
        const encryptedGrade = await EncryptionService.encryptGradeData(
          assignment.grade
        );
        console.log(
          `[PROCESS] Assignment after encryption: ${
            assignment.title
          }, encrypted grade: ${encryptedGrade.substring(0, 20)}...`
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

  processCoursesForSync: async (courses) => {
    if (!courses || !Array.isArray(courses)) return courses;

    const processedCourses = [];

    for (const course of courses) {
      if (!course) {
        processedCourses.push(course);
        continue;
      }

      const processedCourse = { ...course };

      if (
        course.grade !== undefined &&
        course.grade !== null &&
        !course.isGradeEncrypted
      ) {
        processedCourse.grade = await EncryptionService.encryptGradeData(
          course.grade
        );
        processedCourse.isGradeEncrypted = true;
      }

      if (
        course.gradeHistory &&
        Array.isArray(course.gradeHistory) &&
        course.gradeHistory.length > 0
      ) {
        const encryptedHistory = [];

        for (const point of course.gradeHistory) {
          if (
            point &&
            point.grade !== undefined &&
            point.grade !== null &&
            !point.isEncrypted
          ) {
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

      if (course.isGradeEncrypted && course.grade) {
        decryptedCourse.grade = await EncryptionService.decryptGradeData(
          course.grade
        );
        decryptedCourse.isGradeEncrypted = false;
      }

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
