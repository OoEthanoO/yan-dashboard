import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { ApiClient } from "../services/api-client";
import { EncryptionService } from "../services/encryption-service";

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
  }, []);

  const refreshCourses = async () => {
    await fetchCourses();
  };

  const addCourse = async (course: Omit<Course, "id">) => {
    try {
      setLoading(true);

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

      await ApiClient.createCourse(dataToSend);
      await fetchCourses();
    } catch (error) {
      console.error("Failed to add course:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeCourse = async (id: string) => {
    try {
      setLoading(true);
      await ApiClient.deleteCourse(id);
      await fetchCourses();
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
      console.log("Setting course grade:", id, grade);

      setLoading(true);

      if (
        grade === undefined ||
        (typeof grade === "string" && grade.trim() === "")
      ) {
        await ApiClient.updateCourse(id, {
          grade: undefined,
          isGradeEncrypted: false,
        });
      } else {
        const numericGrade = typeof grade === "string" ? Number(grade) : grade;

        const course = courses.find((c) => c.id === id);
        if (course) {
          const encryptedGrade = await EncryptionService.encryptGradeData(
            numericGrade
          );

          const newGradePoint = {
            date: new Date().toISOString(),
            grade: await EncryptionService.encryptGradeData(
              numericGrade as number
            ),
            isEncrypted: true,
          };

          console.log("New grade point:", newGradePoint);

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

          console.log("Updated grade history:", updatedGradeHistory);

          await ApiClient.updateCourse(id, {
            grade: encryptedGrade,
            isGradeEncrypted: true,
            gradeHistory: updatedGradeHistory,
          });
        }
      }

      await fetchCourses();
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
      console.log("Updating course grade history:", id, gradeHistory);
      setLoading(true);

      const encryptedHistory = await Promise.all(
        gradeHistory.map(async (point) => ({
          date: point.date,
          grade: await EncryptionService.encryptGradeData(point.grade),
          isEncrypted: true,
        }))
      );

      console.log("Encrypted grade history:", encryptedHistory);

      let encryptedCurrentGrade;
      let encryptedGradeFlag = false;

      if (gradeHistory.length > 0) {
        const latestPoint = gradeHistory.sort(
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

      await fetchCourses();
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
