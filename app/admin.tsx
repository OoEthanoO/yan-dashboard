import { ApiClient } from "@/services/api-client";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Issue = {
  _id: string;
  title: string;
  description: string;
  type: "bug" | "feature" | "improvement";
  priority: "low" | "medium" | "high";
  status: "open" | "in-progress" | "resolved";
  createdAt: string;
  updatedAt: string;
};

type VersionHistory = {
  _id: string;
  version: string;
  date: string;
  type: "initial" | "production" | "rc" | "beta" | "alpha";
  changes: string[];
  createdAt: string;
  updatedAt: string;
};

type Stats = {
  totalUsers: number;
  totalAssignments: number;
  totalCourses: number;
  totalStudySessions: number;
  totalIssues: number;
  totalVersions: number;
};

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "issues" | "versions"
  >("dashboard");

  const [stats, setStats] = useState<Stats | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [versions, setVersions] = useState<VersionHistory[]>([]);

  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [editingVersion, setEditingVersion] = useState<VersionHistory | null>(
    null
  );

  const [issueForm, setIssueForm] = useState({
    title: "",
    description: "",
    type: "bug" as "bug" | "feature" | "improvement",
    priority: "medium" as "low" | "medium" | "high",
    status: "open" as "open" | "in-progress" | "resolved",
  });

  const [versionForm, setVersionForm] = useState({
    version: "",
    date: new Date().toISOString().split("T")[0],
    type: "alpha" as "initial" | "production" | "rc" | "beta" | "alpha",
    changes: [""],
  });

  const checkAdminAccess = useCallback(async () => {
    try {
      const adminStatus = await ApiClient.isAdmin();
      setIsAdmin(adminStatus);
      if (!adminStatus) {
        Alert.alert("Access Denied", "You don't have admin privileges.", [
          { text: "OK", onPress: () => router.replace("/") },
        ]);
      }
    } catch (error) {
      console.error("Failed to check admin status:", error);
      Alert.alert("Error", "Failed to verify admin access.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    }
  }, [router]);

  const fetchData = useCallback(async () => {
    if (!isAdmin) return;

    try {
      setLoading(true);
      const [statsData, issuesData, versionsData] = await Promise.all([
        ApiClient.getAdminStats(),
        ApiClient.getAdminIssues(),
        ApiClient.getAdminVersionHistory(),
      ]);

      setStats(statsData);
      setIssues(issuesData);
      setVersions(versionsData);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      Alert.alert("Error", "Failed to fetch admin data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleCreateIssue = async () => {
    try {
      await ApiClient.createAdminIssue(issueForm);
      setIssueModalVisible(false);
      resetIssueForm();
      await fetchData();
      Alert.alert("Success", "Issue created successfully");
    } catch (error) {
      console.error("Failed to create issue:", error);
      Alert.alert("Error", "Failed to create issue");
    }
  };

  const handleUpdateIssue = async () => {
    if (!editingIssue) return;

    try {
      await ApiClient.updateAdminIssue(editingIssue._id, issueForm);
      setIssueModalVisible(false);
      setEditingIssue(null);
      resetIssueForm();
      await fetchData();
      Alert.alert("Success", "Issue updated successfully");
    } catch (error) {
      console.error("Failed to update issue:", error);
      Alert.alert("Error", "Failed to update issue");
    }
  };

  const handleDeleteIssue = async (id: string) => {
    Alert.alert("Delete Issue", "Are you sure you want to delete this issue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await ApiClient.deleteAdminIssue(id);
            await fetchData();
            Alert.alert("Success", "Issue deleted successfully");
          } catch (error) {
            console.error("Failed to delete issue:", error);
            Alert.alert("Error", "Failed to delete issue");
          }
        },
      },
    ]);
  };

  const handleCreateVersion = async () => {
    try {
      const versionData = {
        ...versionForm,
        changes: versionForm.changes.filter((change) => change.trim() !== ""),
      };
      await ApiClient.createAdminVersionHistory(versionData);
      setVersionModalVisible(false);
      resetVersionForm();
      await fetchData();
      Alert.alert("Success", "Version history created successfully");
    } catch (error) {
      console.error("Failed to create version history:", error);
      Alert.alert("Error", "Failed to create version history");
    }
  };

  const handleUpdateVersion = async () => {
    if (!editingVersion) return;

    try {
      const versionData = {
        ...versionForm,
        changes: versionForm.changes.filter((change) => change.trim() !== ""),
      };
      await ApiClient.updateAdminVersionHistory(
        editingVersion._id,
        versionData
      );
      setVersionModalVisible(false);
      setEditingVersion(null);
      resetVersionForm();
      await fetchData();
      Alert.alert("Success", "Version history updated successfully");
    } catch (error) {
      console.error("Failed to update version history:", error);
      Alert.alert("Error", "Failed to update version history");
    }
  };

  const handleDeleteVersion = async (id: string) => {
    Alert.alert(
      "Delete Version",
      "Are you sure you want to delete this version history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await ApiClient.deleteAdminVersionHistory(id);
              await fetchData();
              Alert.alert("Success", "Version history deleted successfully");
            } catch (error) {
              console.error("Failed to delete version history:", error);
              Alert.alert("Error", "Failed to delete version history");
            }
          },
        },
      ]
    );
  };

  const resetIssueForm = () => {
    setIssueForm({
      title: "",
      description: "",
      type: "bug",
      priority: "medium",
      status: "open",
    });
  };

  const resetVersionForm = () => {
    setVersionForm({
      version: "",
      date: new Date().toISOString().split("T")[0],
      type: "alpha",
      changes: [""],
    });
  };

  const openIssueModal = (issue?: Issue) => {
    if (issue) {
      setEditingIssue(issue);
      setIssueForm({
        title: issue.title,
        description: issue.description,
        type: issue.type,
        priority: issue.priority,
        status: issue.status,
      });
    } else {
      setEditingIssue(null);
      resetIssueForm();
    }
    setIssueModalVisible(true);
  };

  const openVersionModal = (version?: VersionHistory) => {
    if (version) {
      setEditingVersion(version);
      setVersionForm({
        version: version.version,
        date: version.date,
        type: version.type,
        changes: version.changes.length > 0 ? version.changes : [""],
      });
    } else {
      setEditingVersion(null);
      resetVersionForm();
    }
    setVersionModalVisible(true);
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Verifying admin access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#334155" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "dashboard" && styles.activeTab]}
          onPress={() => setActiveTab("dashboard")}
        >
          <Ionicons
            name="analytics"
            size={20}
            color={activeTab === "dashboard" ? "#ef4444" : "#64748b"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "dashboard" && styles.activeTabText,
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "issues" && styles.activeTab]}
          onPress={() => setActiveTab("issues")}
        >
          <Ionicons
            name="bug"
            size={20}
            color={activeTab === "issues" ? "#ef4444" : "#64748b"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "issues" && styles.activeTabText,
            ]}
          >
            Issues
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "versions" && styles.activeTab]}
          onPress={() => setActiveTab("versions")}
        >
          <Ionicons
            name="git-branch"
            size={20}
            color={activeTab === "versions" ? "#ef4444" : "#64748b"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "versions" && styles.activeTabText,
            ]}
          >
            Versions
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ef4444" />
            <Text style={styles.loadingText}>Loading admin data...</Text>
          </View>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <View style={styles.dashboardContainer}>
                <Text style={styles.sectionTitle}>System Statistics</Text>
                {stats && (
                  <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                      <Ionicons name="people" size={32} color="#3b82f6" />
                      <Text style={styles.statNumber}>{stats.totalUsers}</Text>
                      <Text style={styles.statLabel}>Users</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Ionicons
                        name="document-text"
                        size={32}
                        color="#10b981"
                      />
                      <Text style={styles.statNumber}>
                        {stats.totalAssignments}
                      </Text>
                      <Text style={styles.statLabel}>Assignments</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Ionicons name="school" size={32} color="#f59e0b" />
                      <Text style={styles.statNumber}>
                        {stats.totalCourses}
                      </Text>
                      <Text style={styles.statLabel}>Courses</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Ionicons name="time" size={32} color="#8b5cf6" />
                      <Text style={styles.statNumber}>
                        {stats.totalStudySessions}
                      </Text>
                      <Text style={styles.statLabel}>Study Sessions</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Ionicons name="bug" size={32} color="#ef4444" />
                      <Text style={styles.statNumber}>{stats.totalIssues}</Text>
                      <Text style={styles.statLabel}>Issues</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Ionicons name="git-branch" size={32} color="#06b6d4" />
                      <Text style={styles.statNumber}>
                        {stats.totalVersions}
                      </Text>
                      <Text style={styles.statLabel}>Versions</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {activeTab === "issues" && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Manage Issues</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => openIssueModal()}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                {issues.map((issue) => (
                  <View key={issue._id} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemTitle}>{issue.title}</Text>
                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => openIssueModal(issue)}
                        >
                          <Ionicons name="pencil" size={16} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteIssue(issue._id)}
                        >
                          <Ionicons name="trash" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.itemDescription}>
                      {issue.description}
                    </Text>
                    <View style={styles.itemTags}>
                      <View style={[styles.tag, styles[`${issue.type}Tag`]]}>
                        <Text style={styles.tagText}>{issue.type}</Text>
                      </View>
                      <View
                        style={[styles.tag, styles[`${issue.priority}Tag`]]}
                      >
                        <Text style={styles.tagText}>{issue.priority}</Text>
                      </View>
                      <View style={[styles.tag, styles[`${issue.status}Tag`]]}>
                        <Text style={styles.tagText}>{issue.status}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activeTab === "versions" && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Manage Version History
                  </Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => openVersionModal()}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                {versions.map((version) => (
                  <View key={version._id} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemTitle}>v{version.version}</Text>
                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => openVersionModal(version)}
                        >
                          <Ionicons name="pencil" size={16} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteVersion(version._id)}
                        >
                          <Ionicons name="trash" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.versionDate}>{version.date}</Text>
                    <View style={styles.changesList}>
                      {version.changes.map((change, index) => (
                        <Text key={index} style={styles.changeItem}>
                          • {change}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.itemTags}>
                      <View style={[styles.tag, styles[`${version.type}Tag`]]}>
                        <Text style={styles.tagText}>{version.type}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Issue Modal */}
      <Modal
        visible={issueModalVisible}
        transparent
        onRequestClose={() => setIssueModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingIssue ? "Edit Issue" : "Create Issue"}
              </Text>
              <TouchableOpacity
                onPress={() => setIssueModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={issueForm.title}
                onChangeText={(text) =>
                  setIssueForm({ ...issueForm, title: text })
                }
                placeholder="Issue title"
                placeholderTextColor="#aaa"
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={issueForm.description}
                onChangeText={(text) =>
                  setIssueForm({ ...issueForm, description: text })
                }
                placeholder="Issue description"
                multiline
                numberOfLines={4}
                placeholderTextColor="#aaa"
              />

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.segmentedControl}>
                {["bug", "feature", "improvement"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.segmentButton,
                      issueForm.type === type && styles.segmentButtonActive,
                    ]}
                    onPress={() =>
                      setIssueForm({ ...issueForm, type: type as any })
                    }
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        issueForm.type === type &&
                          styles.segmentButtonTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.segmentedControl}>
                {["low", "medium", "high"].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.segmentButton,
                      issueForm.priority === priority &&
                        styles.segmentButtonActive,
                    ]}
                    onPress={() =>
                      setIssueForm({ ...issueForm, priority: priority as any })
                    }
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        issueForm.priority === priority &&
                          styles.segmentButtonTextActive,
                      ]}
                    >
                      {priority}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.segmentedControl}>
                {["open", "in-progress", "resolved"].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.segmentButton,
                      issueForm.status === status && styles.segmentButtonActive,
                    ]}
                    onPress={() =>
                      setIssueForm({ ...issueForm, status: status as any })
                    }
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        issueForm.status === status &&
                          styles.segmentButtonTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIssueModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={editingIssue ? handleUpdateIssue : handleCreateIssue}
              >
                <Text style={styles.saveButtonText}>
                  {editingIssue ? "Update" : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Version Modal */}
      <Modal
        visible={versionModalVisible}
        transparent
        onRequestClose={() => setVersionModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingVersion ? "Edit Version" : "Create Version"}
              </Text>
              <TouchableOpacity
                onPress={() => setVersionModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Version</Text>
              <TextInput
                style={styles.input}
                value={versionForm.version}
                onChangeText={(text) =>
                  setVersionForm({ ...versionForm, version: text })
                }
                placeholder="e.g., 1.0.0"
                placeholderTextColor="#aaa"
              />

              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.input}
                value={versionForm.date}
                onChangeText={(text) =>
                  setVersionForm({ ...versionForm, date: text })
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#aaa"
              />

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.segmentedControl}>
                {["alpha", "beta", "rc", "production"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.segmentButton,
                      versionForm.type === type && styles.segmentButtonActive,
                    ]}
                    onPress={() =>
                      setVersionForm({ ...versionForm, type: type as any })
                    }
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        versionForm.type === type &&
                          styles.segmentButtonTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Changes</Text>
              {versionForm.changes.map((change, index) => (
                <View key={index} style={styles.changeInputContainer}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={change}
                    onChangeText={(text) => {
                      const newChanges = [...versionForm.changes];
                      newChanges[index] = text;
                      setVersionForm({ ...versionForm, changes: newChanges });
                    }}
                    placeholder={`Change ${index + 1}`}
                    placeholderTextColor="#aaa"
                  />
                  {versionForm.changes.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeChangeButton}
                      onPress={() => {
                        const newChanges = versionForm.changes.filter(
                          (_, i) => i !== index
                        );
                        setVersionForm({ ...versionForm, changes: newChanges });
                      }}
                    >
                      <Ionicons
                        name="remove-circle"
                        size={24}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity
                style={styles.addChangeButton}
                onPress={() => {
                  setVersionForm({
                    ...versionForm,
                    changes: [...versionForm.changes, ""],
                  });
                }}
              >
                <Ionicons name="add" size={20} color="#3b82f6" />
                <Text style={styles.addChangeText}>Add Change</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setVersionModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={
                  editingVersion ? handleUpdateVersion : handleCreateVersion
                }
              >
                <Text style={styles.saveButtonText}>
                  {editingVersion ? "Update" : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 20,
    fontWeight: "700",
    color: "#ef4444",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#ef4444",
  },
  tabText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#ef4444",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  dashboardContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    minWidth: "30%",
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: "#ef4444",
    borderRadius: 8,
    padding: 8,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  itemActions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  itemDescription: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
    lineHeight: 20,
  },
  versionDate: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  changesList: {
    marginBottom: 12,
  },
  changeItem: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
  },
  itemTags: {
    flexDirection: "row",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
  },
  bugTag: {
    backgroundColor: "#fee2e2",
  },
  featureTag: {
    backgroundColor: "#fef3c7",
  },
  improvementTag: {
    backgroundColor: "#e0f2fe",
  },
  lowTag: {
    backgroundColor: "#e0f2fe",
  },
  mediumTag: {
    backgroundColor: "#fef3c7",
  },
  highTag: {
    backgroundColor: "#fee2e2",
  },
  openTag: {
    backgroundColor: "#fee2e2",
  },
  "in-progressTag": {
    backgroundColor: "#fef3c7",
  },
  resolvedTag: {
    backgroundColor: "#dcfce7",
  },
  alphaTag: {
    backgroundColor: "#fef3c7",
  },
  betaTag: {
    backgroundColor: "#e0f2fe",
  },
  rcTag: {
    backgroundColor: "#d1fae5",
  },
  productionTag: {
    backgroundColor: "#dcfce7",
  },
  initialTag: {
    backgroundColor: "#f3f4f6",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 500,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  segmentButtonTextActive: {
    color: "#111827",
    fontWeight: "600",
  },
  changeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  removeChangeButton: {
    padding: 4,
  },
  addChangeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    marginTop: 8,
  },
  addChangeText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
