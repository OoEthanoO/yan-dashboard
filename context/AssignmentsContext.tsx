import { OperationQueue } from "@/services/operation-queue-service";
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
      const localData = await SyncService.getLocalData();
      if (localData.assignments && localData.assignments.length > 0) {
        const assignmentsWithNumericGrades = localData.assignments.map(
          (a: Assignment) => ({
            ...a,
            grade: a.grade !== undefined ? Number(a.grade) : undefined,
            isGradeEncrypted: false,
          })
        );
        setAssignments(assignmentsWithNumericGrades);
      }

      const data = await ApiClient.getAllData();
      if (data?.assignments) {
        const assignmentsWithNumericGrades = data.assignments.map(
          (a: Assignment) => ({
            ...a,
            grade: a.grade !== undefined ? Number(a.grade) : undefined,
          })
        );

        await AsyncStorage.setItem(
          "assignments",
          JSON.stringify(data.assignments)
        );

        const localAssignments = await SyncService.getLocalData().then(
          (data) => data.assignments || []
        );

        const localIsEqualToServer =
          JSON.stringify(localAssignments) ===
          JSON.stringify(assignmentsWithNumericGrades);

        if (localIsEqualToServer) {
          console.log("Local assignments are up-to-date with server data.");
        } else {
          console.log("Local assignments: ", JSON.stringify(localAssignments));
          console.log(
            "Server assignments: ",
            JSON.stringify(assignmentsWithNumericGrades)
          );
          console.log("Updating assignments from server data.");
          setAssignments(assignmentsWithNumericGrades);
        }
      }
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();

    const unsubscribe = SyncService.subscribeToDataChanges(async () => {
      try {
        const localData = await SyncService.getLocalData();
        if (localData.assignments) {
          const assignmentsWithNumericGrades = localData.assignments.map(
            (a: Assignment) => ({
              ...a,
              grade: a.grade !== undefined ? Number(a.grade) : undefined,
              isGradeEncrypted: false,
            })
          );

          console.log(
            "assignmentsWithNumericGrades",
            assignmentsWithNumericGrades
          );

          setAssignments(assignmentsWithNumericGrades);
        }
      } catch (error) {
        console.error("Error updating assignments after sync:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshAssignments = async () => {
    await fetchAssignments();
  };

  const addAssignment = async (assignment: Omit<Assignment, "id">) => {
    try {
      setLoading(true);

      const tempId = `temp_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const newAssignment = {
        ...assignment,
        id: tempId,
        grade:
          assignment.grade !== undefined ? Number(assignment.grade) : undefined,
        isGradeEncrypted: false,
      };

      setAssignments((current) => {
        const updated = [...current, newAssignment];
        console.log("Assignments after adding:", updated);
        return updated;
      });

      await OperationQueue.enqueue({
        id: `add-assignment-${Date.now()}`,
        type: "add",
        context: "assignments",
        execute: async () => {
          let processedAssignment = { ...assignment };
          if (assignment.grade !== undefined) {
            const encryptedGrade =
              typeof assignment.grade === "string"
                ? await EncryptionService.encryptGradeData(
                    Number(assignment.grade)
                  )
                : await EncryptionService.encryptGradeData(assignment.grade);

            processedAssignment = {
              ...assignment,
              grade: encryptedGrade,
            };
          }

          // Only perform persistent storage operations
          try {
            const serverAssignment = await ApiClient.createAssignment(
              processedAssignment
            );

            // Then update local storage with the server response
            const localData = await SyncService.getLocalData();
            const updatedAssignments = [
              ...localData.assignments.filter(
                (a: Assignment) => a.id !== tempId
              ), // Remove temp assignment
              { ...processedAssignment, id: serverAssignment.id || tempId },
            ];
            console.log("Updated assignments:", updatedAssignments);
            await SyncService.updateAndSync(updatedAssignments);
          } catch (error) {
            console.error("Error syncing with server:", error);
            // Fallback: just update local storage with temp ID
            const localData = await SyncService.getLocalData();
            const updatedAssignments = [
              ...localData.assignments,
              { ...processedAssignment, id: tempId },
            ];
            await SyncService.updateAndSync(updatedAssignments);
          }
        },
      });
    } catch (error) {
      console.error("Failed to add assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeAssignment = async (id: string) => {
    try {
      setLoading(true);

      setAssignments((current) => current.filter((a) => a.id !== id));

      await OperationQueue.enqueue({
        id: `remove-assignment-${id}-${Date.now()}`,
        type: "remove",
        context: "assignments",
        execute: async () => {
          await ApiClient.markAssignmentForDeletion(id);

          const localData = await SyncService.getLocalData();
          const updatedAssignments = localData.assignments.filter(
            (a: Assignment) => a.id !== id
          );

          await AsyncStorage.setItem(
            "assignments",
            JSON.stringify(updatedAssignments)
          );

          try {
            await ApiClient.deleteAssignment(id);
            console.log(`Assignment ${id} deleted successfully`);

            await SyncService.updateLocalData(
              updatedAssignments,
              undefined,
              undefined,
              false
            );
          } catch (error) {
            console.error(`Error deleting assignment ${id} on server:`, error);
          }
        },
      });
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

      setAssignments((current) =>
        current.map((a) => {
          if (a.id === id) {
            return { ...a, grade: numericGrade };
          }
          return a;
        })
      );

      await OperationQueue.enqueue({
        id: `grade-assignment-${id}-${Date.now()}`,
        type: "update",
        context: "assignments",
        execute: async () => {
          const numericGrade =
            grade === undefined
              ? undefined
              : typeof grade === "string"
              ? Number(grade)
              : grade;

          const assignment = assignments.find((a) => a.id === id);
          if (!assignment) {
            throw new Error("Assignment not found");
          }

          const localData = await SyncService.getLocalData();
          const updatedAssignments = localData.assignments.map(
            (a: Assignment) => {
              if (a.id === id) {
                return {
                  ...a,
                  grade: numericGrade,
                };
              }
              return a;
            }
          );

          await SyncService.updateAndSync(updatedAssignments);

          const dueDate = assignment?.dueDate;
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
            }
          }
        },
      });
    } catch (error) {
      console.error("Failed to update assignment grade:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignmentCompleted = async (id: string) => {
    try {
      setLoading(true);

      setAssignments((current) =>
        current.map((a) => {
          if (a.id === id) {
            return { ...a, completed: !a.completed };
          }
          return a;
        })
      );

      await OperationQueue.enqueue({
        id: `toggle-assignment-${id}-${Date.now()}`,
        type: "update",
        context: "assignments",
        execute: async () => {
          const localData = await SyncService.getLocalData();
          const assignment = localData.assignments.find(
            (a: Assignment) => a.id === id
          );

          if (assignment) {
            const updatedAssignments = localData.assignments.map(
              (a: Assignment) => {
                if (a.id === id) {
                  return {
                    ...a,
                    completed: !a.completed,
                  };
                }
                return a;
              }
            );

            await SyncService.updateAndSync(updatedAssignments);

            await ApiClient.updateAssignment(id, {
              completed: !assignment.completed,
            });
          }
        },
      });
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

      setAssignments((current) =>
        current.map((a) => {
          if (a.id === id) {
            return { ...a, ...updatedData };
          }
          return a;
        })
      );

      await OperationQueue.enqueue({
        id: `update-assignment-${id}-${Date.now()}`,
        type: "update",
        context: "assignments",
        execute: async () => {
          let processedUpdate = { ...updatedData };
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

            processedUpdate = {
              ...updatedData,
              grade: encryptedGrade,
              isGradeEncrypted: encryptedGrade !== undefined,
            };
          }

          const localData = await SyncService.getLocalData();
          const updatedAssignments = localData.assignments.map(
            (a: Assignment) => {
              if (a.id === id) {
                return {
                  ...a,
                  ...updatedData,
                };
              }
              return a;
            }
          );

          await SyncService.updateAndSync(updatedAssignments);

          await ApiClient.updateAssignment(id, processedUpdate);
        },
      });
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
