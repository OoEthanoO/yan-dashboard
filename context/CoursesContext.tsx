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
import { OperationQueue } from "../services/operation-queue-service";
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

      const localData = await SyncService.getLocalData();
      if (localData.courses && localData.courses.length > 0) {
        const coursesWithNumericGrades = localData.courses.map((c: Course) => ({
          ...c,
          grade: c.grade !== undefined ? Number(c.grade) : undefined,
          isGradeEncrypted: false,
          gradeHistory: c.gradeHistory?.map((point) => ({
            ...point,
            grade: Number(point.grade),
          })),
        }));
        setCourses(coursesWithNumericGrades);
      }

      const data = await ApiClient.getAllData();
      if (data?.courses) {
        const coursesWithNumericGrades = data.courses.map((c: Course) => ({
          ...c,
          grade: c.grade !== undefined ? Number(c.grade) : undefined,
          gradeHistory: c.gradeHistory?.map((point) => ({
            ...point,
            grade: Number(point.grade),
          })),
        }));

        await AsyncStorage.setItem("courses", JSON.stringify(data.courses));

        const localCourses = await SyncService.getLocalData().then(
          (data) => data.courses || []
        );

        if (
          JSON.stringify(localCourses) ===
          JSON.stringify(coursesWithNumericGrades)
        ) {
          console.log("Local courses are already up-to-date.");
        } else {
          console.log("Updating local courses with server data.");
          console.log("Local courses:", JSON.stringify(localCourses));
          console.log(
            "Courses from server:",
            JSON.stringify(coursesWithNumericGrades)
          );
          setCourses(coursesWithNumericGrades);
        }
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();

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

      await OperationQueue.enqueue({
        id: `add-course-${Date.now()}`,
        type: "add",
        context: "courses",
        execute: async () => {
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

          const tempId = `temp_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`;
          const newCourse = {
            ...course,
            id: tempId,
          };

          const localData = await SyncService.getLocalData();
          const updatedCourses = [...localData.courses, newCourse];
          await SyncService.updateAndSync(undefined, updatedCourses);

          await fetchCourses();
        },
      });
    } catch (error) {
      console.error("Failed to add course:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeCourse = async (id: string) => {
    try {
      setLoading(true);

      await OperationQueue.enqueue({
        id: `remove-course-${id}-${Date.now()}`,
        type: "remove",
        context: "courses",
        execute: async () => {
          const localData = await SyncService.getLocalData();

          const updatedCourses = localData.courses.filter(
            (c: Course) => c.id !== id
          );

          const updatedAssignments = localData.assignments.filter(
            (a: Assignment) => a.courseId !== id
          );
          const updatedSessions = localData.studySessions.filter(
            (s: StudySession) => s.courseId !== id
          );

          await SyncService.updateAndSync(
            updatedAssignments,
            updatedCourses,
            updatedSessions
          );

          await ApiClient.deleteCourse(id);
        },
      });
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

      await OperationQueue.enqueue({
        id: `grade-course-${id}-${Date.now()}`,
        type: "update",
        context: "courses",
        execute: async () => {
          const localData = await SyncService.getLocalData();
          const course = courses.find((c) => c.id === id);

          if (!course) {
            throw new Error("Course not found");
          }

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

          await SyncService.updateAndSync(undefined, updatedCourses);

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

            await ApiClient.updateCourse(id, {
              grade: encryptedGrade,
              isGradeEncrypted: true,
              gradeHistory: updatedGradeHistory,
            });
          }
        },
      });
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

      await OperationQueue.enqueue({
        id: `update-course-history-${id}-${Date.now()}`,
        type: "update",
        context: "courses",
        execute: async () => {
          const localData = await SyncService.getLocalData();
          const updatedCourses = localData.courses.map((c: Course) => {
            if (c.id === id) {
              let currentGrade = c.grade;
              if (gradeHistory.length > 0) {
                const latestPoint = [...gradeHistory].sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
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

          await SyncService.updateAndSync(undefined, updatedCourses);

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

          await ApiClient.updateCourse(id, {
            gradeHistory: encryptedHistory,
            grade: encryptedCurrentGrade,
            isGradeEncrypted: encryptedGradeFlag,
          });
        },
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
