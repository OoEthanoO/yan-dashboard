import { APP_FULL_VERSION } from "@/constants";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ApiClient } from "../services/api-client";
import { SyncService } from "../services/sync-service";

export default function ProfileBar() {
  const { user, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();
  const [isDebugMode, setIsDebugMode] = useState(false);

  if (!user) return null;

  const checkDebugMode = useCallback(async () => {
    try {
      const isDebug = await ApiClient.isDebugMode();
      setIsDebugMode(isDebug);
    } catch (error) {
      console.error("Failed to check debug mode:", error);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkDebugMode();
    }, 500);

    const interval = setInterval(checkDebugMode, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [checkDebugMode]);

  useEffect(() => {
    setIsSyncing(true);

    const originalRequest = ApiClient.request;
    let activeRequests = 0;

    ApiClient.request = async (endpoint, method, data) => {
      try {
        if (user) {
          setIsSyncing(true);
          activeRequests++;
        }

        const result = await originalRequest.call(
          ApiClient,
          endpoint,
          method,
          data
        );
        return result;
      } catch (error) {
        console.error(`API request failed for ${endpoint}:`, error);
        throw error;
      } finally {
        if (user) {
          activeRequests--;
          if (activeRequests === 0) {
            setIsSyncing(false);
          }
        }
      }
    };

    const unsubscribe = SyncService.subscribeToDataChanges(() => {
      setIsSyncing(false);
    });

    const timer = setTimeout(() => {
      if (activeRequests === 0) {
        setIsSyncing(false);
      }
    }, 2000);

    return () => {
      ApiClient.request = originalRequest;
      unsubscribe();
      clearTimeout(timer);
    };
  }, [user]);

  const getInitials = () => {
    if (!user?.name) return "?";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        {isDebugMode && <Text style={styles.debugText}>DEBUG</Text>}
      </View>
      <View style={styles.profileSection}>
        {isSyncing && (
          <ActivityIndicator
            size="small"
            color="#3b82f6"
            style={styles.syncIndicator}
          />
        )}
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => setMenuVisible(!menuVisible)}
        >
          <View style={styles.avatar}>
            <Text style={styles.initials}>{getInitials()}</Text>
          </View>
          <Text style={styles.username} numberOfLines={1}>
            {user.name}
          </Text>
          <Ionicons
            name={menuVisible ? "chevron-up" : "chevron-down"}
            size={16}
            color="#64748b"
          />
        </TouchableOpacity>
      </View>

      {menuVisible && (
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              router.push("/account");
            }}
          >
            <Ionicons name="person" size={18} color="#64748b" />
            <Text style={styles.menuItemText}>Account Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              router.push("/issues");
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#64748b"
            />
            <Text style={styles.menuItemText}>Known Issues</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              router.push("/privacy");
            }}
          >
            <Ionicons name="shield-outline" size={18} color="#64748b" />
            <Text style={styles.menuItemText}>Privacy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              router.push("/version-history");
            }}
          >
            <Ionicons name="git-branch" size={18} color="#64748b" />
            <Text style={styles.menuItemText}>Version History</Text>
          </TouchableOpacity>

          {/* Add Ko-fi donation option */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              const kofiUrl = "https://ko-fi.com/ethanyanxu";
              if (Platform.OS === "web") {
                window.open(kofiUrl, "_blank");
              } else {
                WebBrowser.openBrowserAsync(kofiUrl);
              }
            }}
          >
            <Ionicons name="cafe" size={18} color="#29abe0" />
            <Text style={styles.menuItemText}>Support Development</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <View style={styles.menuVersionContainer}>
            <Text style={styles.versionText}>{APP_FULL_VERSION}</Text>
          </View>

          <TouchableOpacity
            style={[styles.menuItem, styles.logoutItem]}
            onPress={async () => {
              setMenuVisible(false);
              await logout();
            }}
          >
            <Ionicons name="log-out" size={18} color="#ef4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    ...(Platform.OS === "web" && { zIndex: 1 }),
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  username: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
    maxWidth: 100,
  },
  menu: {
    position: "absolute",
    top: 48,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    width: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 200,
    ...Platform.select({
      web: {
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      },
    }),
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: "#334155",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 4,
  },
  logoutItem: {
    marginTop: 4,
  },
  logoutText: {
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "500",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    justifyContent: "flex-end",
  },
  syncIndicator: {
    marginRight: 8,
  },
  debugText: {
    color: "#ef4444",
    fontSize: 12,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuVersionContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  versionText: {
    fontSize: 12,
    color: "#94a3b8",
  },
});
