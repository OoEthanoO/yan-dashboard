import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type Course = {
  id: string;
  name: string;
  grade?: number;
};

type CoursesContextType = {
  courses: Course[];
  addCourse: (course: Omit<Course, "id">) => void;
  removeCourse: (id: string) => void;
  setCourseGrade: (id: string, grade: string | number) => void;
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

  function setCourseGrade(id: string, grade: string | number) {
    const numericGrade = typeof grade === "string" ? Number(grade) : grade;

    setCourses((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, grade: isNaN(numericGrade) ? undefined : numericGrade }
          : c
      )
    );
  }

  return (
    <CoursesContext.Provider
      value={{ courses, addCourse, removeCourse, setCourseGrade }}
    >
      {children}
    </CoursesContext.Provider>
  );
}
