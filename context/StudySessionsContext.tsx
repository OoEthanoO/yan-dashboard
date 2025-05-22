import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { ApiClient } from "../services/api-client";

// Study sessions don't contain grade data, so no encryption needed for this context
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
      const data = await ApiClient.getAllData();
      if (data?.studySessions) {
        setSessions(data.studySessions);
      }
    } catch (error) {
      console.error("Failed to fetch study sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchSessions();
  }, []);

  const refreshSessions = async () => {
    await fetchSessions();
  };

  const addSession = async (session: Omit<StudySession, "id">) => {
    try {
      setLoading(true);
      await ApiClient.createStudySession(session);
      await fetchSessions();
    } catch (error) {
      console.error("Failed to add study session:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeSession = async (id: string) => {
    try {
      setLoading(true);
      await ApiClient.deleteStudySession(id);
      await fetchSessions();
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
