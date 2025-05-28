import { EncryptionService } from "@/services/encryption-service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CryptoJS from "crypto-js";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import { ApiClient } from "../services/api-client";
import { SyncService } from "../services/sync-service";

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
  lastSyncTime: Date | null;
  isOnline: boolean;
  isSyncing: boolean;
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
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef(false);

  const SYNC_INTERVAL = 5 * 60 * 1000;

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (isSyncing || isSyncingRef.current) {
          e.preventDefault();
          const message =
            "You have unsaved changes. Are you sure you want to leave?";
          e.returnValue = message;
          return message;
        }
      };

      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [isSyncing]);

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

  const performPeriodicSync = async () => {
    if (isSyncingRef.current || !user) {
      console.log(
        "Skipping periodic sync - another sync is already in progress"
      );
      return;
    }

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);
      console.log("Performing periodic sync...");

      await SyncService.performFullSync();

      await SyncService.refreshAllData();

      setLastSyncTime(new Date());
      setIsOnline(true);

      console.log("Periodic sync completed successfully.");
    } catch (error: any) {
      console.error("Periodic sync failed:", error);
      if (error.message !== "Sync aborted") {
        setIsOnline(false);
      }

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      syncIntervalRef.current = setInterval(performPeriodicSync, 60 * 1000);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  };

  const startPeriodicSync = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
    syncIntervalRef.current = setInterval(performPeriodicSync, SYNC_INTERVAL);
    console.log(`Periodic sync started with ${SYNC_INTERVAL / 1000}s interval`);
  };

  const stopPeriodicSync = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
      console.log("Periodic sync stopped");
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

  useEffect(() => {
    if (user && !loading) {
      startPeriodicSync();

      performPeriodicSync();
    } else {
      stopPeriodicSync();
    }

    return () => {
      stopPeriodicSync();
    };
  }, [user, loading]);

  async function login(email: string, password: string) {
    try {
      const user = await ApiClient.login(email, password);

      const passwordHash = CryptoJS.SHA256(password).toString();
      await AsyncStorage.setItem("password_hash", passwordHash);

      await EncryptionService.retrieveEncryptionKeyFromServer();

      setUser(user);

      setIsSyncing(true);

      await syncData();
      await SyncService.refreshAllData();

      return user;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsSyncing(false);
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
      stopPeriodicSync();

      await ApiClient.logout();
      setUser(null);

      await Promise.all([
        AsyncStorage.removeItem("assignments"),
        AsyncStorage.removeItem("courses"),
        AsyncStorage.removeItem("study_sessions"),
        AsyncStorage.removeItem("password_hash"),
        AsyncStorage.removeItem("user_encryption_key"),
        AsyncStorage.removeItem("deleted_assignments"),
        AsyncStorage.removeItem("aiSuggestions"),
        AsyncStorage.removeItem("lastSyncTime"),
      ]);
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
      value={{
        user,
        loading,
        login,
        register,
        logout,
        syncData,
        updateUser,
        lastSyncTime,
        isOnline,
        isSyncing,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
