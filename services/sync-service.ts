import { Assignment } from "@/context/AssignmentsContext";
import { Course } from "@/context/CoursesContext";
import { StudySession } from "@/context/StudySessionsContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiClient } from "./api-client";
import { EncryptionService } from "./encryption-service";

type DataChangeListener = () => void;
const listeners: DataChangeListener[] = [];

export const SyncService = {
  subscribeToDataChanges: (listener: DataChangeListener) => {
    // console.log("SUBSCRIBE TO DATA CHANGES");
    listeners.push(listener);
    // console.log("Current listeners count:", listeners.length);
    return () => {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    };
  },

  notifyDataChanged: () => {
    // console.log("NOTIFY DATA CHANGED");
    listeners.forEach((listener) => listener());
  },

  getLocalData: async () => {
    try {
      // console.log("GET LOCAL DATA");
      const [assignmentsStr, coursesStr, studySessionsStr] = await Promise.all([
        AsyncStorage.getItem("assignments"),
        AsyncStorage.getItem("courses"),
        AsyncStorage.getItem("study_sessions"),
      ]);

      // console.log("GOT LOCAL DATA");

      return {
        assignments: assignmentsStr ? JSON.parse(assignmentsStr) : [],
        courses: coursesStr ? JSON.parse(coursesStr) : [],
        studySessions: studySessionsStr ? JSON.parse(studySessionsStr) : [],
      };
    } catch (error) {
      console.error("Failed to load local data:", error);
      return { assignments: [], courses: [], studySessions: [] };
    }
  },

  updateAndSync: async (
    updatedAssignments?: Assignment[],
    updatedCourses?: Course[],
    updatedStudySessions?: StudySession[]
  ) => {
    try {
      console.log("UPDATE AND SYNC");
      const updatePromises = [];

      if (updatedAssignments) {
        // Ensure grades are properly formatted
        const processedAssignments = updatedAssignments.map((a) => ({
          ...a,
          grade: a.grade !== undefined ? Number(a.grade) : undefined,
          isGradeEncrypted: false,
        }));

        updatePromises.push(
          AsyncStorage.setItem(
            "assignments",
            JSON.stringify(processedAssignments)
          )
        );
      }

      if (updatedCourses) {
        // Ensure grades are properly formatted
        const processedCourses = updatedCourses.map((c) => ({
          ...c,
          grade: c.grade !== undefined ? Number(c.grade) : undefined,
          isGradeEncrypted: false,
          gradeHistory: c.gradeHistory?.map((point) => ({
            ...point,
            grade: Number(point.grade),
            isEncrypted: false,
          })),
        }));

        updatePromises.push(
          AsyncStorage.setItem("courses", JSON.stringify(processedCourses))
        );
      }

      if (updatedStudySessions) {
        updatePromises.push(
          AsyncStorage.setItem(
            "study_sessions",
            JSON.stringify(updatedStudySessions)
          )
        );
      }

      await Promise.all(updatePromises);

      // Notify listeners that local data has changed
      SyncService.notifyDataChanged();

      // Then perform server sync in the background
      // We don't await this so the function can return immediately after local update
      SyncService.performFullSync().catch((error) => {
        console.error("Background sync failed:", error);
      });

      return true;
    } catch (error) {
      console.error("Failed to update and sync data:", error);
      throw error;
    }
  },

  performFullSync: async () => {
    try {
      console.log("PERFORM FULL SYNC");
      const [assignmentsStr, coursesStr, studySessionsStr] = await Promise.all([
        AsyncStorage.getItem("assignments"),
        AsyncStorage.getItem("courses"),
        AsyncStorage.getItem("study_sessions"),
      ]);

      const assignments = assignmentsStr ? JSON.parse(assignmentsStr) : [];
      const courses = coursesStr ? JSON.parse(coursesStr) : [];
      const studySessions = studySessionsStr
        ? JSON.parse(studySessionsStr)
        : [];

      const processedAssignments =
        await EncryptionService.processAssignmentsForSync(assignments);

      const processedCourses = await EncryptionService.processCoursesForSync(
        courses
      );

      const response = await ApiClient.syncData(
        processedAssignments,
        processedCourses,
        studySessions
      );

      await AsyncStorage.setItem("deleted_assignments", JSON.stringify([]));

      const storageUpdates = [];

      if (response?.assignments?.length > 0) {
        let processedAssignments = response.assignments;

        // console.log("Processing assignments for sync:", processedAssignments);

        // Check if there are any encrypted grades that need to be decrypted
        // processedAssignments = await EncryptionService.decryptAssignments(
        //   processedAssignments
        // );

        // console.log(
        //   "Processed assignments preformatting:",
        //   processedAssignments
        // );

        // Format grades as numbers
        processedAssignments = processedAssignments.map((a: Assignment) => ({
          ...a,
          grade: a.grade !== undefined ? Number(a.grade) : undefined,
          isGradeEncrypted: false,
        }));

        // console.log("Processed assignments:", processedAssignments);

        storageUpdates.push(
          AsyncStorage.setItem(
            "assignments",
            JSON.stringify(processedAssignments)
          )
        );
      }

      // Ensure courses are properly decrypted
      if (response?.courses?.length > 0) {
        let processedCourses = response.courses;

        console.log("Processing courses for sync:", processedCourses);

        // Check if there are any encrypted grades that need to be decrypted
        // processedCourses = await EncryptionService.decryptCourses(
        //   processedCourses
        // );

        console.log("Processed courses preformatting:", processedCourses);

        // Format grades as numbers
        processedCourses = processedCourses.map((c: Course) => ({
          ...c,
          grade: c.grade !== undefined ? Number(c.grade) : undefined,
          isGradeEncrypted: false,
          gradeHistory: c.gradeHistory?.map((point) => ({
            ...point,
            grade: Number(point.grade),
            isEncrypted: false,
          })),
        }));

        storageUpdates.push(
          AsyncStorage.setItem("courses", JSON.stringify(processedCourses))
        );
      }

      if (response?.studySessions?.length > 0) {
        storageUpdates.push(
          AsyncStorage.setItem(
            "study_sessions",
            JSON.stringify(response.studySessions)
          )
        );
      }

      await Promise.all(storageUpdates);

      SyncService.notifyDataChanged();

      console.log("PERFORMED FULL SYNC");
      return response;
    } catch (error) {
      console.error("Failed to sync with server:", error);
      throw error;
    }
  },

  syncAllData: async (
    updatedAssignments?: Assignment[],
    updatedCourses?: Course[],
    updatedStudySessions?: StudySession[]
  ) => {
    console.log("SYNC ALL DATA");

    return SyncService.updateAndSync(
      updatedAssignments,
      updatedCourses,
      updatedStudySessions
    );
  },

  refreshAllData: async () => {
    try {
      console.log("REFRESH ALL DATA");
      const data = await ApiClient.getAllData();

      // Ensure data is properly decrypted before storage
      let assignments = data?.assignments || [];
      let courses = data?.courses || [];

      // Decrypt data if needed
      if (assignments.some((a: Assignment) => a.isGradeEncrypted)) {
        assignments = await EncryptionService.decryptAssignments(assignments);
      }

      if (
        courses.some(
          (c: Course) =>
            c.isGradeEncrypted || c.gradeHistory?.some((p) => p.isEncrypted)
        )
      ) {
        courses = await EncryptionService.decryptCourses(courses);
      }

      const storageUpdates = [];

      if (assignments.length > 0) {
        // Format the now-decrypted data for storage
        const processedAssignments = assignments.map((a: Assignment) => ({
          ...a,
          grade: a.grade !== undefined ? Number(a.grade) : undefined,
          isGradeEncrypted: false,
        }));

        storageUpdates.push(
          AsyncStorage.setItem(
            "assignments",
            JSON.stringify(processedAssignments)
          )
        );
      }

      if (courses.length > 0) {
        // Format the now-decrypted data for storage
        const processedCourses = courses.map((c: Course) => ({
          ...c,
          grade: c.grade !== undefined ? Number(c.grade) : undefined,
          isGradeEncrypted: false,
          gradeHistory: c.gradeHistory?.map((point) => ({
            ...point,
            grade: Number(point.grade),
            isEncrypted: false,
          })),
        }));

        storageUpdates.push(
          AsyncStorage.setItem("courses", JSON.stringify(processedCourses))
        );
      }

      if (data?.studySessions) {
        storageUpdates.push(
          AsyncStorage.setItem(
            "study_sessions",
            JSON.stringify(data.studySessions)
          )
        );
      }

      await Promise.all(storageUpdates);

      SyncService.notifyDataChanged();
      return data;
    } catch (error) {
      console.error("Failed to refresh data from server:", error);
      throw error;
    }
  },
};
