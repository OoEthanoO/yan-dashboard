import { APP_VERSION } from "@/constants";
import { ApiClient } from "@/services/api-client";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type VersionHistoryItem = {
  _id?: string; // Optional: if you use MongoDB's _id as a key
  version: string;
  date: string;
  type: "initial" | "production" | "rc" | "beta" | "alpha";
  changes: string[];
};

const testEnvironments = [
  {
    name: "Alpha",
    url: "https://alpha.yandashboard.com",
    description:
      "Earliest testing phase with new experimental features. By using this branch, you acknowledge that you may experience data loss, data corruption, account glitches, or other issues. Please use at your own risk.",
    badgeColor: "#fef3c7",
    textColor: "#92400e",
  },
  {
    name: "Beta",
    url: "https://beta.yandashboard.com",
    description:
      "More stable with refined features ready for wider testing. By using this branch, you acknowledge that you may experience abnormalities that may profoundly affect your experience.",
    badgeColor: "#e0f2fe",
    textColor: "#0369a1",
  },
  {
    name: "RC",
    url: "https://rc.yandashboard.com",
    description:
      "Final testing phase before production release. By using this branch, you acknowledge that you may encounter many bugs and issues that may affect your experience.",
    badgeColor: "#d1fae5",
    textColor: "#065f46",
  },
  {
    name: "Production",
    url: "https://yandashboard.com",
    description: "Stable production version",
    badgeColor: "#dcfce7",
    textColor: "#14532d",
  },
];

// const versionHistory = [
// {
// version: "0.2.0-alpha.2",
// date: "2025-05-25",
// type: "alpha",
// changes: [
// "Resolve bug 683357e0fe6ceb0e81f67e6a: Grade points added through grade history are off by one day",
// ],
// },
// {
// version: "0.2.0-alpha.1",
// date: "2025-05-25",
// type: "alpha",
// changes: ["Add prerelease warning for non-production environments"],
// },
// {
// version: "0.1.1",
// date: "2025-05-25",
// type: "production",
// changes: ["Hotfix", "Correct testing environment URLs"],
// },
// {
// version: "0.1.0",
// date: "2025-05-25",
// type: "initial",
// changes: [
// "Initial release of Yan Dashboard",
// "Student assignment tracking",
// "Course management",
// "Study session logging",
// "Grade tracking with encryption",
// "Basic AI productivity suggestions",
// ],
// },
// {
// version: "0.1.0-beta.1",
// date: "2025-05-22",
// type: "beta",
// changes: [
// "Beta testing release",
// "Fixed critical sync issues",
// "Implemented end-to-end encryption",
// "Added course grade history tracking",
// ],
// },
// {
// version: "0.1.0-alpha.1",
// date: "2025-05-17",
// type: "alpha",
// changes: [
// "Alpha testing release",
// "Basic user authentication",
// "Initial database structure",
// "Prototype UI implementation",
// ],
// },
// ];

export default function VersionHistoryScreen() {
  const router = useRouter();
  const currentVersion = APP_VERSION;
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVersionHistory() {
      try {
        setLoading(true);
        const data = await ApiClient.getVersionHistory();
        setVersionHistory(data);
      } catch (err) {
        console.error("Failed to fetch version history:", err);
        setError("Failed to load version history. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchVersionHistory();
  }, []);

  const handleOpenUrl = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            try {
              router.canGoBack() ? router.back() : router.replace("/");
            } catch (error) {
              router.replace("/");
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#334155" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Version History</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.currentVersionBadge}>
          <Ionicons name="code-working" size={24} color="#3b82f6" />
          <Text style={styles.currentVersionText}>
            Current Version: {currentVersion}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="flask" size={20} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Testing Environments</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Access different build branches of Yan Dashboard through these
          dedicated URLs:
        </Text>

        <View style={styles.environmentsContainer}>
          {testEnvironments.map((env, index) => (
            <TouchableOpacity
              key={env.name}
              style={styles.environmentCard}
              onPress={() => handleOpenUrl(env.url)}
            >
              <View
                style={[
                  styles.environmentBadge,
                  { backgroundColor: env.badgeColor },
                ]}
              >
                <Text
                  style={[
                    styles.environmentBadgeText,
                    { color: env.textColor },
                  ]}
                >
                  {env.name}
                </Text>
              </View>
              <View style={styles.environmentInfo}>
                <Text style={styles.environmentUrl}>{env.url}</Text>
                <Text style={styles.environmentDescription}>
                  {env.description}
                </Text>
              </View>
              <Ionicons name="open-outline" size={18} color="#64748b" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="git-branch" size={20} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Version History</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading version history...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : versionHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No version history available.
            </Text>
          </View>
        ) : (
          versionHistory.map((version, index) => (
            <View
              key={version.version}
              style={[
                styles.versionCard,
                version.version === currentVersion && styles.currentVersionCard,
              ]}
            >
              <View style={styles.versionHeader}>
                <View style={styles.versionInfo}>
                  <Text style={styles.versionNumber}>v{version.version}</Text>
                  <Text style={styles.versionDate}>{version.date}</Text>
                </View>
                <View style={styles.versionBadgeContainer}>
                  <View
                    style={[
                      styles.versionBadge,
                      (version.type === "initial" ||
                        version.type === "production") &&
                        styles.initialBadge,
                      version.type === "rc" && styles.rcBadge,
                      version.type === "beta" && styles.betaBadge,
                      version.type === "alpha" && styles.alphaBadge,
                    ]}
                  >
                    <Text style={styles.versionBadgeText}>
                      {version.type.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.changesList}>
                {version.changes.map((change, changeIndex) => (
                  <View key={changeIndex} style={styles.changeItem}>
                    <View style={styles.bulletPoint} />
                    <Text style={styles.changeText}>{change}</Text>
                  </View>
                ))}
              </View>
              {version._id && (
                <View style={styles.idContainer}>
                  <Text style={styles.idText}>ID: {version._id}</Text>
                </View>
              )}
            </View>
          ))
        )}

        <View style={styles.developmentNote}>
          <Ionicons name="information-circle" size={20} color="#64748b" />
          <Text style={styles.developmentNoteText}>
            This page is intended for developers and power users to track the
            evolution of Yan Dashboard and access different testing
            environments.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  currentVersionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    gap: 10,
  },
  currentVersionText: {
    color: "#1e40af",
    fontWeight: "600",
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  sectionDescription: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
  },
  environmentsContainer: {
    marginBottom: 16,
  },
  environmentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  environmentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  environmentBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  environmentInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },
  environmentUrl: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
    marginBottom: 4,
  },
  environmentDescription: {
    fontSize: 12,
    color: "#64748b",
  },
  versionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  currentVersionCard: {
    borderWidth: 2,
    borderColor: "#bfdbfe",
  },
  versionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  versionInfo: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  versionNumber: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  versionDate: {
    fontSize: 14,
    color: "#64748b",
  },
  versionBadgeContainer: {
    alignItems: "flex-end",
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  initialBadge: {
    backgroundColor: "#dcfce7",
  },
  betaBadge: {
    backgroundColor: "#e0f2fe",
  },
  alphaBadge: {
    backgroundColor: "#fef3c7",
  },
  rcBadge: {
    backgroundColor: "#d1fae5",
  },
  versionBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  changesList: {
    marginTop: 8,
  },
  changeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 8,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3b82f6",
  },
  changeText: {
    fontSize: 14,
    color: "#334155",
    flex: 1,
  },
  developmentNote: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    gap: 10,
    alignItems: "center",
  },
  developmentNoteText: {
    color: "#64748b",
    fontSize: 14,
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 12,
  },
  errorContainer: {
    padding: 20,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyStateText: {
    color: "#94a3b8",
    fontSize: 16,
  },
  idContainer: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  idText: {
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: "monospace",
  },
});
