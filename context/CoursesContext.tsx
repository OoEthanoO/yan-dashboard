import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type GradePoint = {
  date: string;
  grade: number;
};

export type Course = {
  id: string;
  name: string;
  grade?: number;
  gradeHistory?: GradePoint[];
};

type CoursesContextType = {
  courses: Course[];
  addCourse: (course: Omit<Course, "id">) => void;
  removeCourse: (id: string) => void;
  setCourseGrade: (id: string, grade: string | number | undefined) => void;
  updateCourseGradeHistory: (id: string, gradeHistory: GradePoint[]) => void;
};

const STORAGE_KEY = "courses";

const CoursesContext = createContext<CoursesContextType | undefined>(undefined);

export function useCourses() {
  const ctx = useContext(CoursesContext);
  if (!ctx) throw new Error("useCourses must be used within CoursesProvider");
  return ctx;
}

export function CoursesProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        const parsedCourses = JSON.parse(data);
        const coursesWithNumericGrades = parsedCourses.map((c: Course) => ({
          ...c,
          grade: c.grade !== undefined ? Number(c.grade) : undefined,
        }));
        setCourses(coursesWithNumericGrades);
      } else
        setCourses([
          { id: "1", name: "Math" },
          { id: "2", name: "Science" },
        ]);
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  }, [courses]);

  function addCourse(course: Omit<Course, "id">) {
    setCourses((prev) => [
      ...prev,
      { ...course, id: Math.random().toString(36).slice(2) },
    ]);
  }

  function removeCourse(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  function setCourseGrade(id: string, grade: string | number | undefined) {
    if (
      grade === undefined ||
      (typeof grade === "string" && grade.trim() === "")
    ) {
      setCourses((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            return {
              ...c,
              grade: undefined,
            };
          }
          return c;
        })
      );
      return;
    }

    const numericGrade = typeof grade === "string" ? Number(grade) : grade;

    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const newGradePoint = {
            date: new Date().toISOString(),
            grade: isNaN(numericGrade) ? 0 : numericGrade,
          };

          return {
            ...c,
            grade: isNaN(numericGrade) ? undefined : numericGrade,
            gradeHistory: [...(c.gradeHistory || []), newGradePoint],
          };
        }
        return c;
      })
    );
  }

  function updateCourseGradeHistory(id: string, gradeHistory: GradePoint[]) {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const currentGrade =
            gradeHistory.length > 0
              ? gradeHistory.sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )[0].grade
              : undefined;

          return {
            ...c,
            gradeHistory,
            grade: currentGrade,
          };
        }
        return c;
      })
    );
  }

  return (
    <CoursesContext.Provider
      value={{
        courses,
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
