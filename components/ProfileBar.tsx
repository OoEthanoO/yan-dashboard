import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ApiClient } from "../services/api-client";

export default function ProfileBar() {
  const { user, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();
  const [isDebugMode, setIsDebugMode] = useState(false);

  if (!user) return null;

  const checkDebugMode = useCallback(async () => {
    const isDebug = await ApiClient.isDebugMode();
    setIsDebugMode(isDebug);
  }, []);

  useEffect(() => {
    checkDebugMode();

    const interval = setInterval(checkDebugMode, 1000);
    return () => clearInterval(interval);
  }, [checkDebugMode]);

  useEffect(() => {
    const checkDebugMode = async () => {
      const isDebug = await ApiClient.isDebugMode();
      setIsDebugMode(isDebug);
    };
    checkDebugMode();
  }, []);

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
      {isDebugMode && (
        <Text style={{ color: "#ef4444", fontSize: 12 }}>DEBUG</Text>
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
              router.push("/privacy");
            }}
          >
            <Ionicons name="shield-outline" size={18} color="#64748b" />
            <Text style={styles.menuItemText}>Privacy</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

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
    zIndex: 100,
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
});
