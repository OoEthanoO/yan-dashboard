import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { ApiClient } from "../services/api-client";
import { EncryptionService } from "../services/encryption-service";

export type Assignment = {
  id: string;
  title: string;
  dueDate: string;
  description: string;
  courseId: string;
  grade?: number;
  completed?: boolean;
  isGradeEncrypted?: boolean;
};

type AssignmentsContextType = {
  assignments: Assignment[];
  loading: boolean;
  refreshAssignments: () => Promise<void>;
  addAssignment: (a: Omit<Assignment, "id">) => Promise<void>;
  removeAssignment: (id: string) => Promise<void>;
  setAssignmentGrade: (
    id: string,
    grade: string | number | undefined
  ) => Promise<void>;
  toggleAssignmentCompleted: (id: string) => Promise<void>;
  updateAssignment: (
    id: string,
    updatedAssignment: Partial<Assignment>
  ) => Promise<void>;
};

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
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await ApiClient.getAllData();
      if (data?.assignments) {
        const assignmentsWithNumericGrades = data.assignments.map(
          (a: Assignment) => ({
            ...a,
            grade: a.grade !== undefined ? Number(a.grade) : undefined,
            isGradeEncrypted: false,
          })
        );
        setAssignments(assignmentsWithNumericGrades);
      }
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const refreshAssignments = async () => {
    await fetchAssignments();
  };

  const addAssignment = async (assignment: Omit<Assignment, "id">) => {
    try {
      setLoading(true);
      if (assignment.grade !== undefined) {
        const encryptedGrade =
          typeof assignment.grade === "string"
            ? await EncryptionService.encryptGradeData(Number(assignment.grade))
            : await EncryptionService.encryptGradeData(assignment.grade);

        assignment = {
          ...assignment,
          grade: encryptedGrade,
          isGradeEncrypted: true,
        };
      }

      await ApiClient.createAssignment(assignment);
      await fetchAssignments();
    } catch (error) {
      console.error("Failed to add assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeAssignment = async (id: string) => {
    try {
      setLoading(true);
      await ApiClient.deleteAssignment(id);
      await fetchAssignments();
    } catch (error) {
      console.error("Failed to delete assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  const setAssignmentGrade = async (
    id: string,
    grade: string | number | undefined
  ) => {
    try {
      setLoading(true);
      const numericGrade =
        grade === undefined
          ? undefined
          : typeof grade === "string"
          ? Number(grade)
          : grade;

      const dueDate = assignments.find((a) => a.id === id)?.dueDate;
      if (dueDate) {
        const now = new Date();
        if (new Date(dueDate) <= now) {
          const encryptedGrade =
            numericGrade !== undefined
              ? await EncryptionService.encryptGradeData(numericGrade)
              : undefined;

          await ApiClient.updateAssignment(id, {
            grade: encryptedGrade,
            isGradeEncrypted: encryptedGrade !== undefined,
          });
        } else {
          console.warn("Cannot grade future assignments");
        }
      }

      await fetchAssignments();
    } catch (error) {
      console.error("Failed to update assignment grade:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignmentCompleted = async (id: string) => {
    try {
      setLoading(true);
      const assignment = assignments.find((a) => a.id === id);
      if (assignment) {
        await ApiClient.updateAssignment(id, {
          completed: !assignment.completed,
        });
      }
      await fetchAssignments();
    } catch (error) {
      console.error("Failed to toggle assignment completion:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateAssignment = async (
    id: string,
    updatedData: Partial<Assignment>
  ) => {
    try {
      setLoading(true);

      if (updatedData.grade !== undefined) {
        let numericGrade: number | undefined;

        if (typeof updatedData.grade === "string") {
          numericGrade = Number(updatedData.grade);
        } else {
          numericGrade = updatedData.grade;
        }

        const encryptedGrade =
          numericGrade !== undefined
            ? await EncryptionService.encryptGradeData(numericGrade)
            : undefined;

        updatedData = {
          ...updatedData,
          grade: encryptedGrade,
          isGradeEncrypted: encryptedGrade !== undefined,
        };
      }

      await ApiClient.updateAssignment(id, updatedData);
      await fetchAssignments();
    } catch (error) {
      console.error("Failed to update assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AssignmentsContext.Provider
      value={{
        assignments,
        loading,
        refreshAssignments,
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
