import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { ApiClient } from "../services/api-client";
import { EncryptionService } from "../services/encryption-service";
import { SyncService } from "../services/sync-service";
import { Assignment } from "./AssignmentsContext";
import { StudySession } from "./StudySessionsContext";

export type GradePoint = {
  date: string;
  grade: number;
  isEncrypted?: boolean;
};

export type Course = {
  id: string;
  name: string;
  grade?: number;
  gradeHistory?: GradePoint[];
  isGradeEncrypted?: boolean;
};

type CoursesContextType = {
  courses: Course[];
  loading: boolean;
  refreshCourses: () => Promise<void>;
  addCourse: (course: Omit<Course, "id">) => Promise<void>;
  removeCourse: (id: string) => Promise<void>;
  setCourseGrade: (
    id: string,
    grade: string | number | undefined
  ) => Promise<void>;
  updateCourseGradeHistory: (
    id: string,
    gradeHistory: GradePoint[]
  ) => Promise<void>;
};

const CoursesContext = createContext<CoursesContextType | undefined>(undefined);

export function useCourses() {
  const ctx = useContext(CoursesContext);
  if (!ctx) throw new Error("useCourses must be used within CoursesProvider");
  return ctx;
}

export function CoursesProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCourses = async () => {
    try {
      setLoading(true);

      // First load local data immediately
      const localData = await SyncService.getLocalData();
      if (localData.courses && localData.courses.length > 0) {
        const coursesWithNumericGrades = localData.courses.map((c: Course) => ({
          ...c,
          grade: c.grade !== undefined ? Number(c.grade) : undefined,
          isGradeEncrypted: false,
          gradeHistory: c.gradeHistory?.map((point) => ({
            ...point,
            grade: Number(point.grade),
            isEncrypted: false,
          })),
        }));
        setCourses(coursesWithNumericGrades);
      }

      // Then sync with server in background
      const data = await ApiClient.getAllData();
      if (data?.courses) {
        const coursesWithNumericGrades = data.courses.map((c: Course) => ({
          ...c,
          grade: c.grade !== undefined ? Number(c.grade) : undefined,
          isGradeEncrypted: false,
          gradeHistory: c.gradeHistory?.map((point) => ({
            ...point,
            grade: Number(point.grade),
            isEncrypted: false,
          })),
        }));

        // Update local storage
        await AsyncStorage.setItem("courses", JSON.stringify(data.courses));

        // Update state
        setCourses(coursesWithNumericGrades);
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();

    // Subscribe to data changes from SyncService
    const unsubscribe = SyncService.subscribeToDataChanges(async () => {
      try {
        const localData = await SyncService.getLocalData();
        if (localData.courses) {
          const coursesWithNumericGrades = localData.courses.map(
            (c: Course) => ({
              ...c,
              grade: c.grade !== undefined ? Number(c.grade) : undefined,
              isGradeEncrypted: false,
              gradeHistory: c.gradeHistory?.map((point) => ({
                ...point,
                grade: Number(point.grade),
                isEncrypted: false,
              })),
            })
          );
          setCourses(coursesWithNumericGrades);
        }
      } catch (error) {
        console.error("Error updating courses after sync:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshCourses = async () => {
    await fetchCourses();
  };

  const addCourse = async (course: Omit<Course, "id">) => {
    try {
      setLoading(true);

      // Process data for encryption
      let dataToSend = { ...course };
      if (dataToSend.grade !== undefined) {
        dataToSend.grade = await EncryptionService.encryptGradeData(
          dataToSend.grade
        );
        dataToSend.isGradeEncrypted = true;
      }

      if (dataToSend.gradeHistory && dataToSend.gradeHistory.length > 0) {
        dataToSend.gradeHistory = await Promise.all(
          dataToSend.gradeHistory.map(async (point) => ({
            date: point.date,
            grade: await EncryptionService.encryptGradeData(point.grade),
            isEncrypted: true,
          }))
        );
      }

      // Create temp ID for local storage
      const tempId = `temp_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const newCourse = {
        ...course, // Use unencrypted version for local storage
        id: tempId,
      };

      // Update local data immediately
      const localData = await SyncService.getLocalData();
      const updatedCourses = [...localData.courses, newCourse];
      await SyncService.updateAndSync(undefined, updatedCourses);

      // Sync with server in background
      await ApiClient.createCourse(dataToSend);
      await fetchCourses(); // This will replace temp IDs with server IDs
    } catch (error) {
      console.error("Failed to add course:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeCourse = async (id: string) => {
    try {
      setLoading(true);

      // Update local data immediately
      const localData = await SyncService.getLocalData();

      // Remove course from local storage
      const updatedCourses = localData.courses.filter(
        (c: Course) => c.id !== id
      );

      // Also remove related assignments and study sessions
      const updatedAssignments = localData.assignments.filter(
        (a: Assignment) => a.courseId !== id
      );
      const updatedSessions = localData.studySessions.filter(
        (s: StudySession) => s.courseId !== id
      );

      // Update all local data
      await SyncService.updateAndSync(
        updatedAssignments,
        updatedCourses,
        updatedSessions
      );

      // Sync with server in background (server will cascade delete)
      await ApiClient.deleteCourse(id);
    } catch (error) {
      console.error("Failed to remove course:", error);
    } finally {
      setLoading(false);
    }
  };

  const setCourseGrade = async (
    id: string,
    grade: string | number | undefined
  ) => {
    try {
      setLoading(true);

      // Update local data immediately
      const localData = await SyncService.getLocalData();
      const course = courses.find((c) => c.id === id);

      if (!course) {
        throw new Error("Course not found");
      }

      // Process for local storage (unencrypted)
      const numericGrade =
        grade === undefined
          ? undefined
          : typeof grade === "string"
          ? Number(grade)
          : grade;

      const updatedCourses = localData.courses.map((c: Course) => {
        if (c.id === id) {
          const updatedCourse = {
            ...c,
            grade: numericGrade,
          };

          // Add to grade history if provided
          if (numericGrade !== undefined) {
            const newGradePoint = {
              date: new Date().toISOString(),
              grade: numericGrade,
            };

            updatedCourse.gradeHistory = [
              ...(c.gradeHistory || []),
              newGradePoint,
            ];
          }

          return updatedCourse;
        }
        return c;
      });

      // Update local data
      await SyncService.updateAndSync(undefined, updatedCourses);

      // Process for server (encrypted)
      if (
        grade === undefined ||
        (typeof grade === "string" && grade.trim() === "")
      ) {
        await ApiClient.updateCourse(id, {
          grade: undefined,
          isGradeEncrypted: false,
        });
      } else {
        const numericGradeForServer =
          typeof grade === "string" ? Number(grade) : grade;
        const encryptedGrade = await EncryptionService.encryptGradeData(
          numericGradeForServer
        );

        const newGradePoint = {
          date: new Date().toISOString(),
          grade: await EncryptionService.encryptGradeData(
            numericGradeForServer as number
          ),
          isEncrypted: true,
        };

        const encryptedHistory = await Promise.all(
          course.gradeHistory?.map(async (point) => ({
            date: point.date,
            grade: await EncryptionService.encryptGradeData(point.grade),
            isEncrypted: true,
          })) || []
        );

        const updatedGradeHistory = [
          ...(encryptedHistory || []),
          newGradePoint,
        ];

        // Sync with server in background
        await ApiClient.updateCourse(id, {
          grade: encryptedGrade,
          isGradeEncrypted: true,
          gradeHistory: updatedGradeHistory,
        });
      }
    } catch (error) {
      console.error("Failed to update course grade:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateCourseGradeHistory = async (
    id: string,
    gradeHistory: GradePoint[]
  ) => {
    try {
      setLoading(true);

      // Update local data immediately
      const localData = await SyncService.getLocalData();
      const updatedCourses = localData.courses.map((c: Course) => {
        if (c.id === id) {
          // Calculate current grade based on latest history point
          let currentGrade = c.grade;
          if (gradeHistory.length > 0) {
            const latestPoint = [...gradeHistory].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )[0];
            currentGrade = latestPoint.grade;
          }

          return {
            ...c,
            grade: currentGrade,
            gradeHistory,
          };
        }
        return c;
      });

      // Update local storage
      await SyncService.updateAndSync(undefined, updatedCourses);

      // Process for server (encrypted)
      const encryptedHistory = await Promise.all(
        gradeHistory.map(async (point) => ({
          date: point.date,
          grade: await EncryptionService.encryptGradeData(point.grade),
          isEncrypted: true,
        }))
      );

      let encryptedCurrentGrade;
      let encryptedGradeFlag = false;

      if (gradeHistory.length > 0) {
        const latestPoint = [...gradeHistory].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
        encryptedCurrentGrade = await EncryptionService.encryptGradeData(
          latestPoint.grade
        );
        encryptedGradeFlag = true;
      }

      // Sync with server in background
      await ApiClient.updateCourse(id, {
        gradeHistory: encryptedHistory,
        grade: encryptedCurrentGrade,
        isGradeEncrypted: encryptedGradeFlag,
      });
    } catch (error) {
      console.error("Failed to update course grade history:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CoursesContext.Provider
      value={{
        courses,
        loading,
        refreshCourses,
        addCourse,
        removeCourse,
        setCourseGrade,
        updateCourseGradeHistory,
      }}
    >
      {children}
    </CoursesContext.Provider>
  );
}
