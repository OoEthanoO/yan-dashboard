import { APP_VERSION } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const testEnvironments = [
  {
    name: "Alpha",
    url: "https://alpha.yan-dashboard.vercel.app",
    description: "Earliest testing phase with new experimental features",
    badgeColor: "#fef3c7",
    textColor: "#92400e"
  },
  {
    name: "Beta",
    url: "https://beta.yan-dashboard.vercel.app",
    description: "More stable with refined features ready for wider testing",
    badgeColor: "#e0f2fe",
    textColor: "#0369a1",
  },
  {
    name: "RC (Release Candidate)",
    url: "https://rc.yan-dashboard.vercel.app",
    description: "Final testing phase before production release",
    badgeColor: "#d1fae5",
    textColor: "#065f46",
  },
  {
    name: "Production",
    url: "https://yan-dashboard.vercel.app",
    description: "Stable production version",
    badgeColor: "#dcfce7",
    textColor: "#14532d",
  },
];

const versionHistory = [
  {
    version: "0.1.0",
    date: "2025-05-25",
    type: "initial",
    changes: [
      "Initial release of Yan Dashboard",
      "Student assignment tracking",
      "Course management",
      "Study session logging",
      "Grade tracking with encryption",
      "Basic AI productivity suggestions",
    ],
  },
  {
    version: "0.1.0-beta.1",
    date: "2025-05-22",
    type: "beta",
    changes: [
      "Beta testing release",
      "Fixed critical sync issues",
      "Implemented end-to-end encryption",
      "Added course grade history tracking",
    ],
  },
  {
    version: "0.1.0-alpha.1",
    date: "2025-05-17",
    type: "alpha",
    changes: [
      "Alpha testing release",
      "Basic user authentication",
      "Initial database structure",
      "Prototype UI implementation",
    ],
  },
];

export default function VersionHistoryScreen() {
  const router = useRouter();
  const currentVersion = APP_VERSION;
  
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

        {/* Test Environments Section */}
        <View style={styles.sectionHeader}>
          <Ionicons name="flask" size={20} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Testing Environments</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Access different build branches of Yan Dashboard through these dedicated URLs:
        </Text>

        <View style={styles.environmentsContainer}>
          {testEnvironments.map((env, index) => (
            <TouchableOpacity 
              key={env.name} 
              style={styles.environmentCard}
              onPress={() => handleOpenUrl(env.url)}
            >
              <View style={[
                styles.environmentBadge, 
                { backgroundColor: env.badgeColor }
              ]}>
                <Text style={[styles.environmentBadgeText, { color: env.textColor }]}>
                  {env.name}
                </Text>
              </View>
              <View style={styles.environmentInfo}>
                <Text style={styles.environmentUrl}>{env.url}</Text>
                <Text style={styles.environmentDescription}>{env.description}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color="#64748b" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="git-branch" size={20} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Version History</Text>
        </View>

        {versionHistory.map((version, index) => (
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
                    version.type === "initial" && styles.initialBadge,
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
          </View>
        ))}

        <View style={styles.developmentNote}>
          <Ionicons name="information-circle" size={20} color="#64748b" />
          <Text style={styles.developmentNoteText}>
            This page is intended for developers and power users to track the
            evolution of Yan Dashboard and access different testing environments.
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
});