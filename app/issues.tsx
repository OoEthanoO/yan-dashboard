import { ApiClient } from "@/services/api-client";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type IssueItem = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "resolved";
  priority: "low" | "medium" | "high";
  type: "bug" | "feature" | "improvement";
};

export default function KnownIssuesScreen() {
  const router = useRouter();
  const [knownIssues, setKnownIssues] = useState<IssueItem[]>([]);
  const [plannedFeatures, setPlannedFeatures] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchIssuesData = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.getIssuesData();
      console.log("Fetched issues data:", response);

      if (response) {
        setKnownIssues(response.issues || []);
        setPlannedFeatures(response.features || []);
        setLastUpdated(new Date().toLocaleString());
      }
    } catch (error) {
      console.error("Failed to fetch issues data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchIssuesData();
  };

  useEffect(() => {
    fetchIssuesData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Ionicons name="alert-circle" size={16} color="#ef4444" />;
      case "in-progress":
        return <Ionicons name="time" size={16} color="#f59e0b" />;
      case "resolved":
        return <Ionicons name="checkmark-circle" size={16} color="#10b981" />;
      default:
        return null;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <Text style={[styles.badge, styles.highPriorityBadge]}>High</Text>
        );
      case "medium":
        return (
          <Text style={[styles.badge, styles.mediumPriorityBadge]}>Medium</Text>
        );
      case "low":
        return <Text style={[styles.badge, styles.lowPriorityBadge]}>Low</Text>;
      default:
        return null;
    }
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
        <Text style={styles.headerTitle}>Known Issues & Planned Features</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading issues...</Text>
          </View>
        ) : (
          <>
            {lastUpdated && (
              <Text style={styles.lastUpdatedText}>
                Last updated: {lastUpdated}
              </Text>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="bug"
                  size={24}
                  color="#ef4444"
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Known Issues</Text>
              </View>

              {knownIssues.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No known issues at this time
                  </Text>
                </View>
              ) : (
                knownIssues.map((issue) => (
                  <View key={issue.id} style={styles.issueCard}>
                    <View style={styles.issueHeader}>
                      <View style={styles.statusContainer}>
                        {getStatusIcon(issue.status)}
                        <Text style={styles.issueTitle}>{issue.title}</Text>
                      </View>
                      {getPriorityText(issue.priority)}
                    </View>
                    <Text style={styles.issueDescription}>
                      {issue.description}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="bulb"
                  size={24}
                  color="#f59e0b"
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Planned Features</Text>
              </View>

              {plannedFeatures.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No planned features at this time
                  </Text>
                </View>
              ) : (
                plannedFeatures.map((feature) => (
                  <View key={feature.id} style={styles.issueCard}>
                    <View style={styles.issueHeader}>
                      <View style={styles.statusContainer}>
                        {getStatusIcon(feature.status)}
                        <Text style={styles.issueTitle}>{feature.title}</Text>
                      </View>
                      {getPriorityText(feature.priority)}
                    </View>
                    <Text style={styles.issueDescription}>
                      {feature.description}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.feedbackContainer}>
              <Text style={styles.feedbackTitle}>Have feedback?</Text>
              <Text style={styles.feedbackText}>
                If you've encountered an issue not listed here or have feature
                suggestions, please let us know through the feedback form.
              </Text>
              <TouchableOpacity style={styles.feedbackButton}>
                <Ionicons name="send" size={16} color="#fff" />
                <Text style={styles.feedbackButtonText}>Send Feedback</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  lastUpdatedText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
    marginBottom: 16,
    fontStyle: "italic",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionIcon: {
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  emptyState: {
    alignItems: "center",
    padding: 20,
  },
  emptyStateText: {
    color: "#94a3b8",
    fontSize: 15,
  },
  issueCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  issueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  issueDescription: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "500",
    overflow: "hidden",
  },
  highPriorityBadge: {
    backgroundColor: "#fee2e2",
    color: "#ef4444",
  },
  mediumPriorityBadge: {
    backgroundColor: "#fef3c7",
    color: "#f59e0b",
  },
  lowPriorityBadge: {
    backgroundColor: "#e0f2fe",
    color: "#3b82f6",
  },
  feedbackContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  feedbackButton: {
    flexDirection: "row",
    backgroundColor: "#3b82f6",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    gap: 8,
  },
  feedbackButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
