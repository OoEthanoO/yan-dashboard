import AsyncStorage from "@react-native-async-storage/async-storage";
import CryptoJS from "crypto-js";
import { ApiClient } from "./api-client";

const AI_PUBLIC_KEY = "AI_MODEL_PUBLIC_KEY_2023";

const USER_ENCRYPTION_KEY = "user_encryption_key";

let keyMemoryCache = null;

export const EncryptionService = {
  getUserEncryptionKey: async () => {
    if (keyMemoryCache) {
      return keyMemoryCache;
    }

    let userKey = await EncryptionService.retrieveEncryptionKeyFromServer();

    if (userKey) {
      keyMemoryCache = userKey;
      return userKey;
    }

    userKey = await AsyncStorage.getItem(USER_ENCRYPTION_KEY);

    if (userKey) {
      await EncryptionService.syncEncryptionKey(userKey);
      return userKey;
    }

    userKey = CryptoJS.lib.WordArray.random(256 / 8).toString();
    await AsyncStorage.setItem(USER_ENCRYPTION_KEY, userKey);

    await EncryptionService.syncEncryptionKey(userKey);

    return userKey;
  },

  syncEncryptionKey: async (userKey) => {
    try {
      console.log("[SYNC_KEY] Attempting to sync encryption key to server");
      const passwordHash = await AsyncStorage.getItem("password_hash");
      if (!passwordHash) {
        console.error("[SYNC_KEY] No password hash found, cannot sync key");
        return;
      }

      const encryptedKey = CryptoJS.AES.encrypt(
        userKey,
        passwordHash
      ).toString();

      await ApiClient.updateUserEncryptionKey(encryptedKey);
      console.log("[SYNC_KEY] Successfully synced encryption key to server");
    } catch (error) {
      console.error("[SYNC_KEY] Failed to sync encryption key:", error);
    }
  },

  retrieveEncryptionKeyFromServer: async () => {
    try {
      const response = await ApiClient.getUserEncryptionKey();

      if (response?.encryptedKey) {
        const passwordHash = await AsyncStorage.getItem("password_hash");
        if (!passwordHash) return null;

        const bytes = CryptoJS.AES.decrypt(response.encryptedKey, passwordHash);
        const userKey = bytes.toString(CryptoJS.enc.Utf8);

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
      const userKey = await EncryptionService.getUserEncryptionKey();

      const combinedKey = `${AI_PUBLIC_KEY}_${userKey}`;

      const stringData = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(
        stringData,
        combinedKey
      ).toString();

      return encrypted;
    } catch (error) {
      return null;
    }
  },

  decryptGradeData: async (encryptedData) => {
    if (!encryptedData) return null;

    try {
      const userKey = await EncryptionService.getUserEncryptionKey();
      const combinedKey = `${AI_PUBLIC_KEY}_${userKey}`;

      const bytes = CryptoJS.AES.decrypt(encryptedData, combinedKey);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedString) {
        await EncryptionService.retrieveEncryptionKeyFromServer();

        const newUserKey = await EncryptionService.getUserEncryptionKey();
        const newCombinedKey = `${AI_PUBLIC_KEY}_${newUserKey}`;
        const newBytes = CryptoJS.AES.decrypt(encryptedData, newCombinedKey);
        const newDecryptedString = newBytes.toString(CryptoJS.enc.Utf8);

        if (!newDecryptedString) {
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
      if (assignment && assignment.grade) {
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

      if (course.grade) {
        decryptedCourse.grade = await EncryptionService.decryptGradeData(
          course.grade
        );
        decryptedCourse.isGradeEncrypted = false;
      }

      if (course.gradeHistory && Array.isArray(course.gradeHistory)) {
        const decryptedHistory = [];

        for (const point of course.gradeHistory) {
          if (point && point.grade) {
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
