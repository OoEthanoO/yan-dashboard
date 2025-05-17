import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type Assignment = {
  id: string;
  title: string;
  dueDate: string;
  description: string;
  courseId: string;
  grade?: number;
  completed?: boolean;
};

type AssignmentsContextType = {
  assignments: Assignment[];
  addAssignment: (a: Omit<Assignment, "id">) => void;
  removeAssignment: (id: string) => void;
  setAssignmentGrade: (id: string, grade: string | number) => void;
  toggleAssignmentCompleted: (id: string) => void;
  updateAssignment: (
    id: string,
    updatedAssignment: Partial<Assignment>
  ) => void;
};

const STORAGE_KEY = "assignments";

const AssignmentsContext = createContext<AssignmentsContextType | undefined>(
  undefined
);

export function useAssignments() {
  const ctx = useContext(AssignmentsContext);
  if (!ctx)
    throw new Error("useAssignments must be used within AssignmentsProvider");
  return ctx;
}

export function AssignmentsProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        const parsedAssignments = JSON.parse(data);
        const assignmentsWithNumericGrades = parsedAssignments.map(
          (a: Assignment) => ({
            ...a,
            grade: a.grade !== undefined ? Number(a.grade) : undefined,
          })
        );
        setAssignments(assignmentsWithNumericGrades);
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  }, [assignments]);

  function addAssignment(a: Omit<Assignment, "id">) {
    setAssignments((prev) => [
      ...prev,
      { ...a, id: Math.random().toString(36).slice(2) },
    ]);
  }

  function removeAssignment(id: string) {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  function setAssignmentGrade(id: string, grade: string | number) {
    const numericGrade = typeof grade === "string" ? Number(grade) : grade;

    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const dueDate = new Date(a.dueDate);
          const now = new Date();

          if (dueDate <= now || a.completed) {
            return {
              ...a,
              grade: isNaN(numericGrade) ? undefined : numericGrade,
            };
          } else {
            console.warn("Cannot grade future assignments");
            return a;
          }
        }
        return a;
      })
    );
  }

  function toggleAssignmentCompleted(id: string) {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  }

  function updateAssignment(id: string, updatedData: Partial<Assignment>) {
    if (
      updatedData.grade !== undefined &&
      typeof updatedData.grade === "string"
    ) {
      updatedData.grade = Number(updatedData.grade);
    }

    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updatedData } : a))
    );
  }

  return (
    <AssignmentsContext.Provider
      value={{
        assignments,
        addAssignment,
        removeAssignment,
        setAssignmentGrade,
        toggleAssignmentCompleted,
        updateAssignment,
      }}
    >
      {children}
    </AssignmentsContext.Provider>
  );
}
