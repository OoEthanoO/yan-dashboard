import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { ApiClient } from "../services/api-client";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  lastSync?: string;
};

type UpdateUserData = {
  name?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  syncData: () => Promise<void>;
  updateUser: (data: UpdateUserData) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const updateUser = async (data: { name?: string }) => {
    try {
      setLoading(true);
      const response = await ApiClient.updateUser(data);
      setUser((prev) => (prev ? { ...prev, ...data } : null));
      return response;
    } catch (error) {
      console.error("User update failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await ApiClient.getToken();
        if (token) {
          const data = await ApiClient.getMe();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        await ApiClient.setToken(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const user = await ApiClient.login(email, password);
      setUser(user);
      await syncData();
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function register(email: string, password: string, name: string) {
    setLoading(true);
    try {
      const user = await ApiClient.register(email, password, name);
      setUser(user);
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      await ApiClient.logout();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  }

  async function syncData() {
    if (!user) return;

    try {
      const assignmentsStr = await AsyncStorage.getItem("assignments");
      const coursesStr = await AsyncStorage.getItem("courses");
      const studySessionsStr = await AsyncStorage.getItem("study_sessions");

      const assignments = assignmentsStr ? JSON.parse(assignmentsStr) : [];
      const courses = coursesStr ? JSON.parse(coursesStr) : [];
      const studySessions = studySessionsStr
        ? JSON.parse(studySessionsStr)
        : [];

      const updatedData = await ApiClient.syncData(
        assignments,
        courses,
        studySessions
      );

      if (updatedData.assignments?.length > 0) {
        await AsyncStorage.setItem(
          "assignments",
          JSON.stringify(updatedData.assignments)
        );
      }

      if (updatedData.courses?.length > 0) {
        await AsyncStorage.setItem(
          "courses",
          JSON.stringify(updatedData.courses)
        );
      }

      if (updatedData.studySessions?.length > 0) {
        await AsyncStorage.setItem(
          "study_sessions",
          JSON.stringify(updatedData.studySessions)
        );
      }
    } catch (error) {
      console.error("Data sync failed:", error);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, syncData, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
