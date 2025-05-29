import { Assignment } from "@/context/AssignmentsContext";
import { Course } from "@/context/CoursesContext";
import { StudySession } from "@/context/StudySessionsContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiClient } from "./api-client";
import { EncryptionService } from "./encryption-service";

type DataChangeListener = () => void;
const listeners: DataChangeListener[] = [];

type SyncLock = {
  isLocked: boolean;
  operation: string | null;
  operationStartTime: number | null;
  priority: number;
};

const syncLock: SyncLock = {
  isLocked: false,
  operation: null,
  operationStartTime: null,
  priority: 0,
};

let activeSyncAbortController: AbortController | null = null;

const LOCAL_LAST_UPDATE_KEY = "local_last_update_time";

const updateLocalLastUpdateTime = async () => {
  const now = new Date().toISOString();
  await AsyncStorage.setItem(LOCAL_LAST_UPDATE_KEY, now);
  return now;
};

const getLocalLastUpdateTime = async () => {
  return (
    (await AsyncStorage.getItem(LOCAL_LAST_UPDATE_KEY)) ||
    new Date(0).toISOString()
  );
};

export const SyncService = {
  isSyncInProgress: () => syncLock.isLocked,

  getCurrentSyncInfo: () => ({
    inProgress: syncLock.isLocked,
    operation: syncLock.operation,
    duration: syncLock.operationStartTime
      ? Math.round((Date.now() - syncLock.operationStartTime) / 1000)
      : 0,
  }),

  acquireLock: async (
    operation: string,
    priority: number = 1
  ): Promise<boolean> => {
    if (!syncLock.isLocked) {
      syncLock.isLocked = true;
      syncLock.operation = operation;
      syncLock.operationStartTime = Date.now();
      syncLock.priority = priority;
      console.log(
        `[SYNC] Lock acquired by "${operation}" (priority: ${priority})`
      );
      return true;
    }

    if (priority > syncLock.priority) {
      console.log(
        `[SYNC] Attempting to interrupt "${syncLock.operation}" for higher priority "${operation}"`
      );

      if (activeSyncAbortController) {
        activeSyncAbortController.abort();
        activeSyncAbortController = null;
      }

      const waitStart = Date.now();
      while (syncLock.isLocked && Date.now() - waitStart < 2000) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      if (!syncLock.isLocked) {
        syncLock.isLocked = true;
        syncLock.operation = operation;
        syncLock.operationStartTime = Date.now();
        syncLock.priority = priority;
        console.log(
          `[SYNC] Lock acquired by "${operation}" after interrupting previous operation`
        );
        return true;
      }

      console.log(
        `[SYNC] Failed to interrupt "${syncLock.operation}" for "${operation}"`
      );
    }

    console.log(
      `[SYNC] "${operation}" waiting for lock held by "${syncLock.operation}"`
    );
    const waitStart = Date.now();
    while (syncLock.isLocked && Date.now() - waitStart < 5000) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!syncLock.isLocked) {
      syncLock.isLocked = true;
      syncLock.operation = operation;
      syncLock.operationStartTime = Date.now();
      syncLock.priority = priority;
      console.log(`[SYNC] Lock acquired by "${operation}" after waiting`);
      return true;
    }

    console.log(`[SYNC] "${operation}" failed to acquire lock after waiting`);
    return false;
  },

  releaseLock: (operation: string): boolean => {
    if (syncLock.operation === operation) {
      syncLock.isLocked = false;
      syncLock.operation = null;
      syncLock.operationStartTime = null;
      syncLock.priority = 0;
      console.log(`[SYNC] Lock released by "${operation}"`);
      return true;
    } else if (syncLock.isLocked) {
      console.log(
        `[SYNC] "${operation}" attempted to release lock held by "${syncLock.operation}"`
      );
    }
    return false;
  },

  forceReleaseLock: () => {
    const prevOp = syncLock.operation;
    syncLock.isLocked = false;
    syncLock.operation = null;
    syncLock.operationStartTime = null;
    syncLock.priority = 0;
    if (activeSyncAbortController) {
      activeSyncAbortController.abort();
      activeSyncAbortController = null;
    }
    console.log(`[SYNC] Lock force released from "${prevOp}"`);
    return true;
  },

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

  getLocalData: async () => {
    try {
      const [assignmentsStr, coursesStr, studySessionsStr] = await Promise.all([
        AsyncStorage.getItem("assignments"),
        AsyncStorage.getItem("courses"),
        AsyncStorage.getItem("study_sessions"),
      ]);

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
    updatedStudySessions?: StudySession[],
    performSync: boolean = true
  ) => {
    const operation = `updateAndSync-${Date.now()}`;
    const lockAcquired = await SyncService.acquireLock(operation, 2);

    if (!lockAcquired) {
      console.error(`[SYNC] Failed to acquire lock for "${operation}"`);
      throw new Error(
        "Could not acquire sync lock - another operation is in progress"
      );
    }

    try {
      console.log("UPDATE AND SYNC");
      const updatePromises = [];
      const now = await updateLocalLastUpdateTime();

      if (updatedAssignments) {
        const timestampsStr = await AsyncStorage.getItem(
          "assignments_timestamps"
        );
        let timestamps = timestampsStr ? JSON.parse(timestampsStr) : {};

        updatedAssignments.forEach((a) => {
          timestamps[a.id] = now;
        });

        const processedAssignments = updatedAssignments.map((a) => ({
          ...a,
          grade: a.grade !== undefined ? Number(a.grade) : undefined,
          isGradeEncrypted: false,
        }));

        updatePromises.push(
          AsyncStorage.setItem(
            "assignments",
            JSON.stringify(processedAssignments)
          ),
          AsyncStorage.setItem(
            "assignments_timestamps",
            JSON.stringify(timestamps)
          )
        );
      }

      if (updatedCourses) {
        const timestampsStr = await AsyncStorage.getItem("courses_timestamps");
        let timestamps = timestampsStr ? JSON.parse(timestampsStr) : {};

        updatedCourses.forEach((c) => {
          timestamps[c.id] = now;
        });

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
          AsyncStorage.setItem("courses", JSON.stringify(processedCourses)),
          AsyncStorage.setItem("courses_timestamps", JSON.stringify(timestamps))
        );
      }

      if (updatedStudySessions) {
        const timestampsStr = await AsyncStorage.getItem(
          "study_sessions_timestamps"
        );
        let timestamps = timestampsStr ? JSON.parse(timestampsStr) : {};

        updatedStudySessions.forEach((s) => {
          timestamps[s.id] = now;
        });

        updatePromises.push(
          AsyncStorage.setItem(
            "study_sessions",
            JSON.stringify(updatedStudySessions)
          ),
          AsyncStorage.setItem(
            "study_sessions_timestamps",
            JSON.stringify(timestamps)
          )
        );
      }

      await Promise.all(updatePromises);

      SyncService.notifyDataChanged();

      if (performSync) {
        SyncService.performFullSync(false).catch((error) => {
          console.error("[SYNC] Background sync failed:", error);
        });
      }

      return true;
    } catch (error) {
      console.error(`[SYNC] Failed to update and sync data:`, error);
      throw error;
    } finally {
      SyncService.releaseLock(operation);
    }
  },

  performFullSync: async (isPeriodic: boolean = true) => {
    const operation = `fullSync-${
      isPeriodic ? "periodic" : "manual"
    }-${Date.now()}`;
    const priority = isPeriodic ? 1 : 2;

    const lockAcquired = await SyncService.acquireLock(operation, priority);
    if (!lockAcquired) {
      console.log(
        `[SYNC] Skipping sync "${operation}" - couldn't acquire lock`
      );
      return null;
    }

    activeSyncAbortController = new AbortController();
    const signal = activeSyncAbortController.signal;

    try {
      console.log(`[SYNC] Starting full sync (periodic: ${isPeriodic})`);

      const localLastUpdateTime = await getLocalLastUpdateTime();

      if (signal.aborted) {
        console.log(`[SYNC] "${operation}" aborted before starting`);
        throw new Error("Sync aborted");
      }

      const [assignmentsStr, coursesStr, studySessionsStr] = await Promise.all([
        AsyncStorage.getItem("assignments"),
        AsyncStorage.getItem("courses"),
        AsyncStorage.getItem("study_sessions"),
      ]);

      if (signal.aborted) {
        console.log(`[SYNC] "${operation}" aborted after loading local data`);
        throw new Error("Sync aborted");
      }

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

      if (signal.aborted) {
        console.log(`[SYNC] "${operation}" aborted after processing data`);
        throw new Error("Sync aborted");
      }

      const response = await ApiClient.syncData(
        processedAssignments,
        processedCourses,
        studySessions,
        localLastUpdateTime
      );

      if (signal.aborted) {
        console.log(`[SYNC] "${operation}" aborted after API call`);
        throw new Error("Sync aborted");
      }

      if (response?.serverLastUpdateTime) {
        await AsyncStorage.setItem(
          LOCAL_LAST_UPDATE_KEY,
          response.serverLastUpdateTime
        );
      }

      await AsyncStorage.setItem("deleted_assignments", JSON.stringify([]));

      const storageUpdates = [];

      if (response?.assignments?.length > 0) {
        let processedAssignments = response.assignments;

        processedAssignments = processedAssignments.map((a: Assignment) => ({
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

      if (response?.courses?.length > 0) {
        let processedCourses = response.courses;

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

      if (signal.aborted) {
        console.log(`[SYNC] "${operation}" aborted before storage update`);
        throw new Error("Sync aborted");
      }

      await Promise.all(storageUpdates);

      SyncService.notifyDataChanged();

      console.log(`[SYNC] COMPLETED FULL SYNC (${operation})`);
      return response;
    } catch (error) {
      if (signal.aborted) {
        console.log(`[SYNC] "${operation}" was aborted`);
      } else {
        console.error(`[SYNC] Failed to sync with server:`, error);
      }
      throw error;
    } finally {
      SyncService.releaseLock(operation);
      if (
        activeSyncAbortController &&
        activeSyncAbortController.signal === signal
      ) {
        activeSyncAbortController = null;
      }
    }
  },

  syncAllData: async (
    updatedAssignments?: Assignment[],
    updatedCourses?: Course[],
    updatedStudySessions?: StudySession[]
  ) => {
    console.log("[SYNC] SYNC ALL DATA");

    return SyncService.updateAndSync(
      updatedAssignments,
      updatedCourses,
      updatedStudySessions
    );
  },

  refreshAllData: async () => {
    const operation = `refreshAllData-${Date.now()}`;
    const lockAcquired = await SyncService.acquireLock(operation, 2);

    if (!lockAcquired) {
      console.error(`[SYNC] Failed to acquire lock for "${operation}"`);
      throw new Error(
        "Could not acquire sync lock - another operation is in progress"
      );
    }

    try {
      console.log("[SYNC] REFRESH ALL DATA");
      const data = await ApiClient.getAllData();

      let assignments = data?.assignments || [];
      let courses = data?.courses || [];

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
      console.error(`[SYNC] Failed to refresh data from server:`, error);
      throw error;
    } finally {
      SyncService.releaseLock(operation);
    }
  },

  updateLocalData: async (
    assignments?: Assignment[],
    courses?: Course[],
    studySessions?: StudySession[],
    triggerSync: boolean = true
  ) => {
    const operation = `updateLocalData-${Date.now()}`;
    const lockAcquired = await SyncService.acquireLock(operation, 2);

    if (!lockAcquired) {
      console.error(`[SYNC] Failed to acquire lock for "${operation}"`);
      throw new Error(
        "Could not acquire sync lock - another operation is in progress"
      );
    }

    try {
      const updatePromises = [];

      if (assignments) {
        const processedAssignments = assignments.map((a) => ({
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

      if (courses) {
        updatePromises.push(
          AsyncStorage.setItem("courses", JSON.stringify(courses))
        );
      }

      if (studySessions) {
        updatePromises.push(
          AsyncStorage.setItem("study_sessions", JSON.stringify(studySessions))
        );
      }

      await Promise.all(updatePromises);

      SyncService.notifyDataChanged();

      if (triggerSync) {
        SyncService.performFullSync().catch(console.error);
      }

      return true;
    } catch (error) {
      console.error(`[SYNC] Failed to update local data:`, error);
      throw error;
    } finally {
      SyncService.releaseLock(operation);
    }
  },
};
