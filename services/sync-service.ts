import { Assignment } from "@/context/AssignmentsContext";
import { Course } from "@/context/CoursesContext";
import { StudySession } from "@/context/StudySessionsContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiClient } from "./api-client";
import { EncryptionService } from "./encryption-service";

// Event system for notifying contexts of data changes
type DataChangeListener = () => void;
const listeners: DataChangeListener[] = [];

export const SyncService = {
  /**
   * Register a listener for data changes
   */
  subscribeToDataChanges: (listener: DataChangeListener) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    };
  },

  /**
   * Notify all listeners of data changes
   */
  notifyDataChanged: () => {
    listeners.forEach((listener) => listener());
  },

  /**
   * Updates local data and then syncs all data with the server
   * This is the main function that should be called after any data change
   */
  updateAndSync: async (
    updatedAssignments?: Assignment[],
    updatedCourses?: Course[],
    updatedStudySessions?: StudySession[]
  ) => {
    try {
      // First update local storage with the changes
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

      // Then perform a full sync with the server
      return await SyncService.performFullSync();
    } catch (error) {
      console.error("Failed to update and sync data:", error);
      throw error;
    }
  },

  /**
   * Syncs all data with the server - always gets all data types
   * regardless of which was updated
   */
  performFullSync: async () => {
    try {
      // Get all data from storage
      const [assignmentsStr, coursesStr, studySessionsStr] = await Promise.all([
        AsyncStorage.getItem("assignments"),
        AsyncStorage.getItem("courses"),
        AsyncStorage.getItem("study_sessions"),
      ]);

      // Parse the data
      const assignments = assignmentsStr ? JSON.parse(assignmentsStr) : [];
      const courses = coursesStr ? JSON.parse(coursesStr) : [];
      const studySessions = studySessionsStr
        ? JSON.parse(studySessionsStr)
        : [];

      // Process data for sync (encryption, etc.)
      const processedAssignments =
        await EncryptionService.processAssignmentsForSync(assignments);

      const processedCourses = await EncryptionService.processCoursesForSync(
        courses
      );

      // Sync with server
      const response = await ApiClient.syncData(
        processedAssignments,
        processedCourses,
        studySessions
      );

      // Handle deleted assignments
      await AsyncStorage.setItem("deleted_assignments", JSON.stringify([]));

      // Update local storage with the server response
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

      // Notify all contexts that data has changed
      SyncService.notifyDataChanged();

      return response;
    } catch (error) {
      console.error("Failed to sync with server:", error);
      throw error;
    }
  },

  /**
   * Legacy method for backward compatibility
   */
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

  /**
   * Refresh all data from server
   */
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
