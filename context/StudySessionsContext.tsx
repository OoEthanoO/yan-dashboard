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
import { SyncService } from "../services/sync-service";

export type StudySession = {
  id: string;
  courseId: string;
  date: string;
  durationMinutes: number;
  notes?: string;
};

type StudySessionsContextType = {
  sessions: StudySession[];
  loading: boolean;
  refreshSessions: () => Promise<void>;
  addSession: (session: Omit<StudySession, "id">) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  getSessionsByCourse: (courseId: string) => StudySession[];
};

const StudySessionsContext = createContext<
  StudySessionsContextType | undefined
>(undefined);

export function useStudySessions() {
  const ctx = useContext(StudySessionsContext);
  if (!ctx)
    throw new Error(
      "useStudySessions must be used within StudySessionsProvider"
    );
  return ctx;
}

export function StudySessionsProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSessions = async () => {
    try {
      setLoading(true);

      const localData = await SyncService.getLocalData();
      if (localData.studySessions && localData.studySessions.length > 0) {
        setSessions(localData.studySessions);
      }

      const data = await ApiClient.getAllData();
      if (data?.studySessions) {
        await AsyncStorage.setItem(
          "study_sessions",
          JSON.stringify(data.studySessions)
        );

        const localSessions = await SyncService.getLocalData().then(
          (data) => data.studySessions || []
        );

        if (
          JSON.stringify(localSessions) === JSON.stringify(data.studySessions)
        ) {
          console.log("Local study sessions are already up-to-date.");
        } else {
          console.log("Updating local study sessions from server data.");
          setSessions(data.studySessions);
        }
      }
    } catch (error) {
      console.error("Failed to fetch study sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    const unsubscribe = SyncService.subscribeToDataChanges(async () => {
      try {
        const localData = await SyncService.getLocalData();
        if (localData.studySessions) {
          setSessions(localData.studySessions);
        }
      } catch (error) {
        console.error("Error updating study sessions after sync:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshSessions = async () => {
    await fetchSessions();
  };

  const addSession = async (session: Omit<StudySession, "id">) => {
    try {
      setLoading(true);

      await OperationQueue.enqueue({
        id: `add-session-${Date.now()}`,
        type: "add",
        context: "study-sessions",
        execute: async () => {
          const tempId = `${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`;
          const newSession = {
            ...session,
            id: tempId,
          };

          const localData = await SyncService.getLocalData();
          const updatedSessions = [...localData.studySessions, newSession];
          await SyncService.updateAndSync(
            undefined,
            undefined,
            updatedSessions
          );

          await fetchSessions();
        },
      });
    } catch (error) {
      console.error("Failed to add study session:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeSession = async (id: string) => {
    try {
      setLoading(true);

      await OperationQueue.enqueue({
        id: `remove-session-${id}-${Date.now()}`,
        type: "remove",
        context: "study-sessions",
        execute: async () => {
          const localData = await SyncService.getLocalData();
          const updatedSessions = localData.studySessions.filter(
            (s: StudySession) => s.id !== id
          );
          await SyncService.updateAndSync(
            undefined,
            undefined,
            updatedSessions
          );

          await ApiClient.deleteStudySession(id);
        },
      });
    } catch (error) {
      console.error("Failed to delete study session:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSessionsByCourse = (courseId: string) => {
    return sessions.filter((s) => s.courseId === courseId);
  };

  return (
    <StudySessionsContext.Provider
      value={{
        sessions,
        loading,
        refreshSessions,
        addSession,
        removeSession,
        getSessionsByCourse,
      }}
    >
      {children}
    </StudySessionsContext.Provider>
  );
}
