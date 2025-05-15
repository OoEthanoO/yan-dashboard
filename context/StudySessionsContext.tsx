import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type StudySession = {
  id: string;
  courseId: string;
  date: string;
  durationMinutes: number;
  notes?: string;
};

type StudySessionsContextType = {
  sessions: StudySession[];
  addSession: (session: Omit<StudySession, "id">) => void;
  removeSession: (id: string) => void;
  getSessionsByCourse: (courseId: string) => StudySession[];
};

const STORAGE_KEY = "study_sessions";

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

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) setSessions(JSON.parse(data));
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  function addSession(session: Omit<StudySession, "id">) {
    setSessions((prev) => [
      ...prev,
      { ...session, id: Math.random().toString(36).slice(2) },
    ]);
  }

  function removeSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  function getSessionsByCourse(courseId: string) {
    return sessions.filter((s) => s.courseId === courseId);
  }

  return (
    <StudySessionsContext.Provider
      value={{ sessions, addSession, removeSession, getSessionsByCourse }}
    >
      {children}
    </StudySessionsContext.Provider>
  );
}
