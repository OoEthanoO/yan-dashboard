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
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    };
  },

  notifyDataChanged: () => {
    listeners.forEach((listener) => listener());
  },

  updateAndSync: async (
    updatedAssignments?: Assignment[],
    updatedCourses?: Course[],
    updatedStudySessions?: StudySession[]
  ) => {
    try {
      if (updatedAssignments) {
        await AsyncStorage.setItem(
          "assignments",
          JSON.stringify(updatedAssignments)
        );
      }

      if (updatedCourses) {
        await AsyncStorage.setItem("courses", JSON.stringify(updatedCourses));
      }

      if (updatedStudySessions) {
        await AsyncStorage.setItem(
          "study_sessions",
          JSON.stringify(updatedStudySessions)
        );
      }

      return await SyncService.performFullSync();
    } catch (error) {
      console.error("Failed to update and sync data:", error);
      throw error;
    }
  },

  performFullSync: async () => {
    try {
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
        storageUpdates.push(
          AsyncStorage.setItem(
            "assignments",
            JSON.stringify(response.assignments)
          )
        );
      }

      if (response?.courses?.length > 0) {
        storageUpdates.push(
          AsyncStorage.setItem("courses", JSON.stringify(response.courses))
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
    return SyncService.updateAndSync(
      updatedAssignments,
      updatedCourses,
      updatedStudySessions
    );
  },

  refreshAllData: async () => {
    try {
      const data = await ApiClient.getAllData();

      const storageUpdates = [];

      if (data?.assignments) {
        storageUpdates.push(
          AsyncStorage.setItem("assignments", JSON.stringify(data.assignments))
        );
      }

      if (data?.courses) {
        storageUpdates.push(
          AsyncStorage.setItem("courses", JSON.stringify(data.courses))
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
