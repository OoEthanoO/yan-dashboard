import GradeTrendChart from "@/components/GradeTrendChart";
import ProfileBar from "@/components/ProfileBar";
import { useCourses } from "@/context/CoursesContext";
import { useStudySessions } from "@/context/StudySessionsContext";
import { ApiClient } from "@/services/api-client";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DatePicker from "../components/DatePicker";
import { Assignment, useAssignments } from "../context/AssignmentsContext";

export default function AssignmentsScreen() {
  const {
    courses,
    addCourse,
    removeCourse,
    setCourseGrade,
    updateCourseGradeHistory,
  } = useCourses();

  const {
    assignments,
    addAssignment,
    removeAssignment,
    setAssignmentGrade,
    toggleAssignmentCompleted,
    updateAssignment,
  } = useAssignments();

  const [modalVisible, setModalVisible] = useState(false);
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  const [newCourseName, setNewCourseName] = useState("");

  const { sessions, addSession, removeSession, getSessionsByCourse } =
    useStudySessions();

  const [studyModalVisible, setStudyModalVisible] = useState(false);
  const [studyCourseId, setStudyCourseId] = useState<string>("");
  const [studyDate, setStudyDate] = useState("");
  const [studyDuration, setStudyDuration] = useState("");
  const [studyNotes, setStudyNotes] = useState("");

  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(
    null
  );
  const [assignmentGradeInput, setAssignmentGradeInput] = useState("");
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseGradeInput, setCourseGradeInput] = useState("");

  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [lastSuggestionTime, setLastSuggestionTime] = useState<string | null>(
    null
  );

  const [activeTab, setActiveTab] = useState("assignments");

  const [editingAssignment, setEditingAssignment] = useState<string | null>(
    null
  );
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCourseId, setEditCourseId] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<
    "add" | "edit" | "study"
  >("add");
  const [sortMethod, setSortMethod] = useState<string>("dueDate-asc");
  const [showSortOptions, setShowSortOptions] = useState(false);

  const [expandedCourses, setExpandedCourses] = useState<
    Record<string, boolean>
  >({});

  const [gradeHistoryModalVisible, setGradeHistoryModalVisible] =
    useState(false);
  const [selectedCourseForGradeHistory, setSelectedCourseForGradeHistory] =
    useState<string | null>(null);
  const [newGradePoint, setNewGradePoint] = useState({
    date: new Date().toISOString().split("T")[0],
    grade: "",
  });

  const isIOS = Platform.OS === "ios";

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split("T")[0];

      if (datePickerMode === "add") {
        setDueDate(formattedDate);
      } else if (datePickerMode === "edit") {
        setEditDueDate(formattedDate);
      } else if (datePickerMode === "study") {
        setStudyDate(formattedDate);
      }
    }
  };

  const [isNarrowScreen, setIsNarrowScreen] = useState(false);

  useEffect(() => {
    const checkScreenWidth = () => {
      const screenWidth = Dimensions.get("window").width;
      setIsNarrowScreen(screenWidth < 600);
    };

    checkScreenWidth();

    const subscription = Dimensions.addEventListener(
      "change",
      checkScreenWidth
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    async function loadSavedSuggestions() {
      try {
        const savedData = await AsyncStorage.getItem("aiSuggestions");
        if (savedData) {
          const { suggestions, timestamp } = JSON.parse(savedData);
          setAiSuggestions(suggestions);
          setLastSuggestionTime(timestamp);
        }
      } catch (e) {
        console.error("Failed to load saved suggestions:", e);
      }
    }

    loadSavedSuggestions();
  }, []);

  async function fetchAISuggestions() {
    setLoadingSuggestions(true);
    try {
      const data = await ApiClient.getAiSuggestions(
        assignments,
        courses,
        sessions
      );

      const timestamp = new Date().toISOString();
      setAiSuggestions(data.suggestions);
      setLastSuggestionTime(timestamp);

      await AsyncStorage.setItem(
        "aiSuggestions",
        JSON.stringify({
          suggestions: data.suggestions,
          timestamp,
        })
      );
    } catch (e) {
      console.error("Error fetching AI suggestions:", e);
      setAiSuggestions(
        "Could not fetch AI suggestions. Please check your network connection and try again."
      );
    }
    setLoadingSuggestions(false);
  }

  function confirmDeleteCourse(id: string, courseName: string) {
    const message = `Are you sure you want to delete "${courseName}"? This will also delete all assignments and study sessions for this course. This action cannot be undone.`;
    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        removeCourse(id);
      }
    } else {
      Alert.alert(
        "Delete Course",
        `Are you sure you want to delete "${courseName}"? This will also delete all assignments and study sessions for this course. This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => removeCourse(id),
          },
        ]
      );
    }
  }

  function openStudyModal(courseId: string) {
    setStudyCourseId(courseId);
    setStudyDate(new Date().toISOString().slice(0, 10));
    setStudyDuration("");
    setStudyNotes("");
    setStudyModalVisible(true);
  }

  function handleAddSession() {
    if (!studyCourseId || !studyDate || !studyDuration) return;
    addSession({
      courseId: studyCourseId,
      date: studyDate,
      durationMinutes: parseInt(studyDuration, 10),
      notes: studyNotes,
    });
    setStudyModalVisible(false);
  }

  function handleAdd() {
    if (editingAssignment) {
      handleSaveEdit();
      return;
    }

    if (!title || !dueDate || !selectedCourseId) return;
    addAssignment({ title, dueDate, description, courseId: selectedCourseId });
    setTitle("");
    setDueDate("");
    setDescription("");
    setSelectedCourseId("");
    setModalVisible(false);
  }

  function handleAddCourse() {
    if (!newCourseName) return;
    addCourse({ name: newCourseName });
    setNewCourseName("");
  }

  function getCourseName(courseId: string) {
    return courses.find((c) => c.id === courseId)?.name || "Unknown";
  }

  function handleEditAssignment(id: string) {
    const assignment = assignments.find((a) => a.id === id);
    if (!assignment) return;

    setEditTitle(assignment.title);
    setEditDueDate(assignment.dueDate);
    setEditDescription(assignment.description);
    setEditCourseId(assignment.courseId);
    setEditingAssignment(id);
    setModalVisible(true);
  }

  function handleSaveEdit() {
    if (!editingAssignment || !editTitle || !editDueDate || !editCourseId)
      return;

    updateAssignment(editingAssignment, {
      title: editTitle,
      dueDate: editDueDate,
      description: editDescription,
      courseId: editCourseId,
    });

    setEditTitle("");
    setEditDueDate("");
    setEditDescription("");
    setEditCourseId("");
    setEditingAssignment(null);
    setModalVisible(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Student Dashboard</Text>
            <ProfileBar />
          </View>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "assignments" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("assignments")}
            >
              <Ionicons
                name="document-text"
                size={18}
                color={activeTab === "assignments" ? "#3b82f6" : "#888"}
              />
              {!isNarrowScreen && (
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "assignments" && styles.activeTabText,
                  ]}
                >
                  Assignments
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "study" && styles.activeTab]}
              onPress={() => setActiveTab("study")}
            >
              <Ionicons
                name="time"
                size={18}
                color={activeTab === "study" ? "#3b82f6" : "#888"}
              />
              {!isNarrowScreen && (
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "study" && styles.activeTabText,
                  ]}
                >
                  Study Log
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "courses" && styles.activeTab]}
              onPress={() => setActiveTab("courses")}
            >
              <Ionicons
                name="book"
                size={18}
                color={activeTab === "courses" ? "#3b82f6" : "#888"}
              />
              {!isNarrowScreen && (
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "courses" && styles.activeTabText,
                  ]}
                >
                  Courses
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "insights" && styles.activeTab]}
              onPress={() => setActiveTab("insights")}
            >
              <Ionicons
                name="bulb"
                size={18}
                color={activeTab === "insights" ? "#3b82f6" : "#888"}
              />
              {!isNarrowScreen && (
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "insights" && styles.activeTabText,
                  ]}
                >
                  AI Insights
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Content */}
        {activeTab === "assignments" && renderAssignmentsTab()}
        {activeTab === "study" && renderStudyLogTab()}
        {activeTab === "courses" && renderCoursesTab()}
        {activeTab === "insights" && renderInsightsTab()}

        {/* Add button (tab specific) */}
        {activeTab === "assignments" && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Assignment Modal */}
        <Modal visible={modalVisible} animationType="none" transparent>
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {editingAssignment ? "Edit Assignment" : "Add Assignment"}
              </Text>
              <TextInput
                placeholder="Title"
                style={styles.input}
                value={editingAssignment ? editTitle : title}
                onChangeText={editingAssignment ? setEditTitle : setTitle}
              />
              <Text style={styles.inputLabel}>Due Date</Text>
              <DatePicker
                value={editingAssignment ? editDueDate : dueDate}
                onChange={(date) => {
                  if (editingAssignment) {
                    setEditDueDate(date);
                  } else {
                    setDueDate(date);
                  }
                }}
                style={styles.inlineDatePicker}
              />

              <Text style={styles.inputLabel}>Course</Text>
              <ScrollView horizontal style={{ marginBottom: 8 }}>
                {courses.map((course) => (
                  <TouchableOpacity
                    key={course.id}
                    style={[
                      styles.courseSelectBtn,
                      (editingAssignment
                        ? editCourseId === course.id
                        : selectedCourseId === course.id) &&
                        styles.courseSelectBtnActive,
                    ]}
                    onPress={() => {
                      if (editingAssignment) {
                        setEditCourseId(course.id);
                      } else {
                        setSelectedCourseId(course.id);
                      }
                    }}
                  >
                    <Text
                      style={{
                        color: (
                          editingAssignment
                            ? editCourseId === course.id
                            : selectedCourseId === course.id
                        )
                          ? "#fff"
                          : "#3b82f6",
                        fontWeight: "bold",
                      }}
                    >
                      {course.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput
                placeholder="Description (optional)"
                style={[styles.input, { height: 60 }]}
                value={editingAssignment ? editDescription : description}
                onChangeText={
                  editingAssignment ? setEditDescription : setDescription
                }
                multiline
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    if (editingAssignment) {
                      setEditingAssignment(null);
                    }
                  }}
                >
                  <Text style={{ color: "#888", fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAdd}>
                  <Text
                    style={{
                      color: "#3b82f6",
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    {editingAssignment ? "Save" : "Add"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {/* Courses Modal */}
        <Modal visible={courseModalVisible} animationType="none" transparent>
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Courses</Text>
              <FlatList
                data={courses}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.courseRow}>
                    <Text style={{ flex: 1 }}>{item.name}</Text>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 14, color: "#555" }}>
                        Grade:{" "}
                        {editingCourseId === item.id ? (
                          <>
                            <TextInput
                              value={courseGradeInput}
                              onChangeText={(text) => {
                                const numericInput = text.replace(
                                  /[^0-9]/g,
                                  ""
                                );
                                setCourseGradeInput(numericInput);
                              }}
                              style={[
                                styles.input,
                                { width: 60, marginBottom: 0 },
                              ]}
                              placeholder="e.g. 90"
                              keyboardType="numeric"
                            />
                            <TouchableOpacity
                              onPress={() => {
                                if (courseGradeInput.trim() === "") {
                                  setCourseGrade(item.id, undefined);
                                } else {
                                  setCourseGrade(item.id, courseGradeInput);
                                }
                                setEditingCourseId(null);
                              }}
                            >
                              <Ionicons
                                name="checkmark"
                                size={18}
                                color="#3b82f6"
                              />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            <Text style={{ fontWeight: "bold" }}>
                              {item.grade ?? "N/A"}
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                setEditingCourseId(item.id);
                                setCourseGradeInput(
                                  item.grade !== undefined
                                    ? String(item.grade)
                                    : ""
                                );
                              }}
                            >
                              <Ionicons
                                name="pencil"
                                size={16}
                                color="#888"
                                style={{ marginLeft: 6 }}
                              />
                            </TouchableOpacity>
                          </>
                        )}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => confirmDeleteCourse(item.id, item.name)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#ff6b6b"
                      />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={{ color: "#aaa", textAlign: "center" }}>
                    No courses yet.
                  </Text>
                }
              />
              <TextInput
                placeholder="New course name"
                style={styles.input}
                value={newCourseName}
                onChangeText={setNewCourseName}
              />
              <TouchableOpacity
                style={styles.addCourseBtn}
                onPress={handleAddCourse}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Add Course
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ marginTop: 10, alignSelf: "flex-end" }}
                onPress={() => setCourseModalVisible(false)}
              >
                <Text style={{ color: "#888", fontSize: 16 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={studyModalVisible} animationType="none" transparent>
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Log Study Session</Text>
              <Text style={styles.inputLabel}>Date</Text>
              <DatePicker
                value={studyDate}
                onChange={setStudyDate}
                style={styles.inlineDatePicker}
              />
              <Text style={styles.inputLabel}>Duration (minutes)</Text>
              <TextInput
                placeholder="e.g. 60"
                style={styles.input}
                value={studyDuration}
                onChangeText={setStudyDuration}
                keyboardType="numeric"
              />
              <TextInput
                placeholder="Notes (optional)"
                style={[styles.input, { height: 60 }]}
                value={studyNotes}
                onChangeText={setStudyNotes}
                multiline
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
                <TouchableOpacity onPress={() => setStudyModalVisible(false)}>
                  <Text style={{ color: "#888", fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddSession}>
                  <Text
                    style={{
                      color: "#3b82f6",
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    Log
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
      {/* Grade History Modal */}
      <Modal
        visible={gradeHistoryModalVisible}
        animationType="none"
        transparent
      >
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxHeight: 500 }]}>
            <Text style={styles.modalTitle}>Grade History</Text>
            <Text style={styles.modalSubtitle}>
              {selectedCourseForGradeHistory
                ? getCourseName(selectedCourseForGradeHistory)
                : ""}
            </Text>

            {/* Add New Grade Point Form */}
            <View style={styles.gradeHistoryForm}>
              <Text style={styles.inputLabel}>Add New Grade Point</Text>
              <View style={styles.gradePointInputRow}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.inputLabelSmall}>Date</Text>
                  <DatePicker
                    value={newGradePoint.date}
                    onChange={(date) =>
                      setNewGradePoint((prev) => ({ ...prev, date }))
                    }
                    style={styles.inlineDatePicker}
                  />
                </View>
                <View style={styles.gradeInputContainer}>
                  <Text style={styles.inputLabelSmall}>Grade (%)</Text>
                  <TextInput
                    value={newGradePoint.grade}
                    onChangeText={(text) => {
                      const numericInput = text.replace(/[^0-9]/g, "");
                      const numValue = parseInt(numericInput, 10);
                      if (numValue > 100) {
                        setNewGradePoint((prev) => ({ ...prev, grade: "100" }));
                      } else {
                        setNewGradePoint((prev) => ({
                          ...prev,
                          grade: numericInput,
                        }));
                      }
                    }}
                    style={styles.gradeHistoryInput}
                    placeholder="95"
                    keyboardType="numeric"
                  />
                </View>
                <TouchableOpacity
                  style={styles.addGradePointButton}
                  onPress={addGradeHistoryPoint}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Grade History List */}
            <Text style={[styles.inputLabel, { marginTop: 16 }]}>
              Grade History
            </Text>
            <ScrollView style={styles.gradeHistoryList}>
              {selectedCourseForGradeHistory &&
              courses.find((c) => c.id === selectedCourseForGradeHistory)
                ?.gradeHistory?.length ? (
                courses
                  .find((c) => c.id === selectedCourseForGradeHistory)!
                  .gradeHistory!.sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )
                  .map((point, index) => (
                    <View
                      key={`${point.date}-${index}`}
                      style={styles.gradeHistoryItem}
                    >
                      <View style={styles.gradeHistoryItemContent}>
                        <Text style={styles.gradeHistoryDate}>
                          {new Date(point.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Text>
                        <Text style={styles.gradeHistoryValue}>
                          {point.grade}%
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          deleteGradePoint(selectedCourseForGradeHistory, index)
                        }
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#ff6b6b"
                        />
                      </TouchableOpacity>
                    </View>
                  ))
              ) : (
                <Text style={styles.noDataText}>
                  No grade history data. Add your first grade point above.
                </Text>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setGradeHistoryModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );

  function sortAssignments(assignments: Assignment[]) {
    return [...assignments].sort((a, b) => {
      switch (sortMethod) {
        case "dueDate-asc":
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case "dueDate-desc":
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        case "course":
          const courseA = getCourseName(a.courseId);
          const courseB = getCourseName(b.courseId);
          return courseA.localeCompare(courseB);
        case "title":
          return a.title.localeCompare(b.title);
        case "status":
          return a.completed === b.completed ? 0 : a.completed ? 1 : -1;
        default:
          return 0;
      }
    });
  }

  function renderAssignmentsTab() {
    const sortedAssignments = sortAssignments(assignments);

    return (
      <>
        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortOptions(!showSortOptions)}
          >
            <Ionicons name="funnel-outline" size={18} color="#3b82f6" />
            <Text style={styles.sortButtonText}>
              Sort by: {getSortLabel(sortMethod)}
            </Text>
            <Ionicons
              name={showSortOptions ? "chevron-up" : "chevron-down"}
              size={16}
              color="#3b82f6"
            />
          </TouchableOpacity>

          {showSortOptions && (
            <View style={styles.sortOptionsContainer}>
              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortMethod === "dueDate-asc" && styles.activeSortOption,
                ]}
                onPress={() => {
                  setSortMethod("dueDate-asc");
                  setShowSortOptions(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortMethod === "dueDate-asc" && styles.activeSortOptionText,
                  ]}
                >
                  Due Date (Earliest First)
                </Text>
                {sortMethod === "dueDate-asc" && (
                  <Ionicons name="checkmark" size={16} color="#3b82f6" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortMethod === "dueDate-desc" && styles.activeSortOption,
                ]}
                onPress={() => {
                  setSortMethod("dueDate-desc");
                  setShowSortOptions(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortMethod === "dueDate-desc" &&
                      styles.activeSortOptionText,
                  ]}
                >
                  Due Date (Latest First)
                </Text>
                {sortMethod === "dueDate-desc" && (
                  <Ionicons name="checkmark" size={16} color="#3b82f6" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortMethod === "course" && styles.activeSortOption,
                ]}
                onPress={() => {
                  setSortMethod("course");
                  setShowSortOptions(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortMethod === "course" && styles.activeSortOptionText,
                  ]}
                >
                  Course
                </Text>
                {sortMethod === "course" && (
                  <Ionicons name="checkmark" size={16} color="#3b82f6" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortMethod === "title" && styles.activeSortOption,
                ]}
                onPress={() => {
                  setSortMethod("title");
                  setShowSortOptions(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortMethod === "title" && styles.activeSortOptionText,
                  ]}
                >
                  Title (A-Z)
                </Text>
                {sortMethod === "title" && (
                  <Ionicons name="checkmark" size={16} color="#3b82f6" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortMethod === "status" && styles.activeSortOption,
                ]}
                onPress={() => {
                  setSortMethod("status");
                  setShowSortOptions(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortMethod === "status" && styles.activeSortOptionText,
                  ]}
                >
                  Completion Status
                </Text>
                {sortMethod === "status" && (
                  <Ionicons name="checkmark" size={16} color="#3b82f6" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <FlatList
          data={sortedAssignments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 80, paddingTop: 10 }}
          renderItem={({ item }) => <AssignmentCard item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No assignments yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap + to add your first assignment
              </Text>
            </View>
          }
        />
      </>
    );
  }

  function getSortLabel(method: string): string {
    switch (method) {
      case "dueDate-asc":
        return "Due Date (Earliest)";
      case "dueDate-desc":
        return "Due Date (Latest)";
      case "course":
        return "Course";
      case "title":
        return "Title";
      case "status":
        return "Status";
      default:
        return "Due Date";
    }
  }

  function AssignmentCard({ item }: { item: Assignment }) {
    const [expanded, setExpanded] = useState(false);
    const [localGradeInput, setLocalGradeInput] = useState<string>("");
    const isOverdue = new Date(item.dueDate) < new Date() && !item.completed;
    const courseColor = getColorForCourse(item.courseId);

    useEffect(() => {
      if (editingAssignmentId === item.id) {
        setLocalGradeInput(item.grade !== undefined ? String(item.grade) : "");
      }
    }, [editingAssignmentId]);

    return (
      <View
        style={[
          styles.card,
          item.completed ? styles.completedCard : null,
          isOverdue ? styles.overdueCard : null,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <View
              style={[styles.courseIndicator, { backgroundColor: courseColor }]}
            />
            <Text style={styles.cardTitleText}>{item.title}</Text>
          </View>
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons
              name="calendar"
              size={14}
              color="#666"
              style={styles.metaIcon}
            />
            <Text style={[styles.metaText, isOverdue && styles.overdueText]}>
              {isOverdue ? "Overdue: " : "Due: "}
              {formatDate(item.dueDate)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons
              name="book"
              size={14}
              color="#666"
              style={styles.metaIcon}
            />
            <Text style={styles.metaText}>{getCourseName(item.courseId)}</Text>
          </View>
          {item.grade !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons
                name="ribbon"
                size={14}
                color="#666"
                style={styles.metaIcon}
              />
              <Text style={styles.metaText}>Grade: {item.grade}%</Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              item.completed ? styles.completedButton : styles.incompleteButton,
            ]}
            onPress={() => toggleAssignmentCompleted(item.id)}
          >
            <Ionicons
              name={item.completed ? "checkmark-circle" : "ellipse-outline"}
              size={16}
              color={item.completed ? "#16a34a" : "#666"}
            />
            <Text
              style={[
                styles.actionButtonText,
                item.completed
                  ? styles.completedButtonText
                  : styles.incompleteButtonText,
              ]}
            >
              {item.completed ? "Completed" : "Mark Complete"}
            </Text>
          </TouchableOpacity>

          <View style={styles.rightActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleEditAssignment(item.id)}
            >
              <Ionicons name="pencil" size={18} color="#3b82f6" />
            </TouchableOpacity>

            {/* Grade button - only visible for past due or completed */}
            {(new Date(item.dueDate) <= new Date() || item.completed) && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  setEditingAssignmentId(item.id);
                  setAssignmentGradeInput(
                    item.grade !== undefined ? String(item.grade) : ""
                  );
                }}
              >
                <Ionicons name="create-outline" size={18} color="#3b82f6" />
              </TouchableOpacity>
            )}

            {/* Log Study button */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => openStudyModal(item.courseId)}
            >
              <Ionicons name="timer-outline" size={18} color="#3b82f6" />
            </TouchableOpacity>

            {/* Delete button */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => removeAssignment(item.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Expanded content */}
        {expanded && (
          <View style={styles.expandedContent}>
            {item.description ? (
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionLabel}>Description</Text>
                <Text style={styles.descriptionText}>{item.description}</Text>
              </View>
            ) : null}

            {/* Study sessions for this course */}
            <View style={styles.sessionsBox}>
              <Text style={styles.sessionsLabel}>Study Sessions</Text>
              {getSessionsByCourse(item.courseId).length === 0 ? (
                <Text style={styles.noSessionsText}>
                  No study sessions logged
                </Text>
              ) : (
                getSessionsByCourse(item.courseId).map((session) => (
                  <View key={session.id} style={styles.sessionItem}>
                    <Text style={styles.sessionDate}>
                      {formatDate(session.date)}
                    </Text>
                    <Text style={styles.sessionDuration}>
                      {session.durationMinutes} min
                    </Text>
                    {session.notes && (
                      <Text style={styles.sessionNotes}>{session.notes}</Text>
                    )}
                    <TouchableOpacity onPress={() => removeSession(session.id)}>
                      <Ionicons name="close-circle" size={16} color="#ff6b6b" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* Grade input modal within the card */}
        {editingAssignmentId === item.id && (
          <View style={styles.inlineForm}>
            <Text style={styles.inlineFormTitle}>Update Grade</Text>
            <View style={styles.gradeInputRow}>
              <TextInput
                value={localGradeInput}
                onChangeText={(text) => {
                  const numericInput = text.replace(/[^0-9]/g, "");
                  const numValue = parseInt(numericInput, 10);
                  if (numValue > 100) {
                    setLocalGradeInput("100");
                  } else {
                    setLocalGradeInput(numericInput);
                  }
                }}
                style={styles.gradeInput}
                placeholder="95"
                keyboardType="numeric"
                placeholderTextColor="#aaa"
              />
              <Text style={styles.percentSign}>%</Text>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  if (localGradeInput.trim() === "") {
                    setAssignmentGrade(item.id, undefined);
                  } else {
                    const numValue = parseInt(localGradeInput, 10);
                    const clampedValue = Math.min(
                      Math.max(isNaN(numValue) ? 0 : numValue, 0),
                      100
                    );
                    setAssignmentGrade(item.id, clampedValue.toString());
                  }
                  setEditingAssignmentId(null);
                }}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditingAssignmentId(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  function formatDateDisplay(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function renderStudyLogTab() {
    const sessionsByCourse: Record<string, typeof sessions> = {};
    courses.forEach((course) => {
      sessionsByCourse[course.id] = getSessionsByCourse(course.id);
    });

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.studyStatsContainer}>
          <Text style={styles.sectionTitle}>Study Statistics</Text>

          {/* Total study time */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="time" size={22} color="#3b82f6" />
              <Text style={styles.statTitle}>Total Study Time</Text>
            </View>
            <Text style={styles.statValue}>
              {sessions.reduce((sum, s) => sum + s.durationMinutes, 0)} minutes
            </Text>
          </View>

          {/* Course breakdown */}
          <Text style={styles.sectionSubtitle}>By Course</Text>
          {courses.map((course) => {
            const courseStudy = sessionsByCourse[course.id] || [];
            const totalTime = courseStudy.reduce(
              (sum, s) => sum + s.durationMinutes,
              0
            );

            return (
              <View key={course.id} style={styles.courseStatRow}>
                <Text style={styles.courseStatName}>{course.name}</Text>
                <Text style={styles.courseStatTime}>{totalTime} min</Text>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${Math.min(totalTime / 5, 100)}%` },
                    ]}
                  />
                </View>
                <TouchableOpacity
                  style={styles.logButton}
                  onPress={() => openStudyModal(course.id)}
                >
                  <Text style={styles.logButtonText}>+ Log</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Recent Study Sessions</Text>
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No study sessions yet</Text>
          </View>
        ) : (
          sessions
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            .slice(0, 10)
            .map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionCardHeader}>
                  <Text style={styles.sessionCardCourse}>
                    {getCourseName(session.courseId)}
                  </Text>
                </View>
                <View style={styles.sessionCardDetails}>
                  <View style={styles.sessionCardRow}>
                    <View style={styles.sessionCardTime}>
                      <Ionicons name="time" size={16} color="#666" />
                      <Text style={styles.sessionCardDuration}>
                        {session.durationMinutes} minutes
                      </Text>
                    </View>
                    <Text style={styles.sessionCardDate}>
                      {formatDate(session.date)}
                    </Text>
                  </View>
                  {session.notes && (
                    <Text style={styles.sessionCardNotes}>{session.notes}</Text>
                  )}
                </View>
                <View style={styles.sessionCardFooter}>
                  <TouchableOpacity
                    style={styles.sessionDeleteButton}
                    onPress={() => removeSession(session.id)}
                  >
                    <Ionicons
                      name="trash-bin-outline"
                      size={18}
                      color="#ff6b6b"
                    />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
        )}
      </ScrollView>
    );
  }

  function renderCoursesTab() {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.courseHeader}>
          <Text style={styles.sectionTitle}>My Courses</Text>
          <TouchableOpacity
            style={styles.addCourseButton}
            onPress={() => setCourseModalVisible(true)}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addCourseButtonText}>Add Course</Text>
          </TouchableOpacity>
        </View>

        {courses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No courses yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first course to get started
            </Text>
          </View>
        ) : (
          <FlatList
            data={courses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View style={styles.courseCard}>
                <View style={styles.courseCardContent}>
                  <View
                    style={[
                      styles.courseColorIndicator,
                      { backgroundColor: getColorForCourse(item.id) },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.courseName}>{item.name}</Text>

                    {/* Course stats */}
                    <View style={styles.courseStats}>
                      <View style={styles.courseStat}>
                        <Ionicons name="document-text" size={14} color="#666" />
                        <Text style={styles.courseStatText}>
                          {
                            assignments.filter((a) => a.courseId === item.id)
                              .length
                          }{" "}
                          assignments
                        </Text>
                      </View>
                      <View style={styles.courseStat}>
                        <Ionicons name="time" size={14} color="#666" />
                        <Text style={styles.courseStatText}>
                          {getSessionsByCourse(item.id).reduce(
                            (sum, s) => sum + s.durationMinutes,
                            0
                          )}{" "}
                          minutes studied
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Grade display/edit */}
                  <View style={styles.courseGradeContainer}>
                    <Text style={styles.courseGradeLabel}>Grade</Text>
                    {editingCourseId === item.id ? (
                      <View style={styles.courseGradeEditRow}>
                        <TextInput
                          value={courseGradeInput}
                          onChangeText={(text) => {
                            const numericInput = text.replace(/[^0-9]/g, "");
                            setCourseGradeInput(numericInput);
                          }}
                          style={styles.courseGradeInput}
                          keyboardType="numeric"
                          placeholder="95"
                        />
                        <Text style={styles.percentSign}>%</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setCourseGrade(item.id, courseGradeInput);
                            setEditingCourseId(null);
                          }}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color="#16a34a"
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View>
                        <TouchableOpacity
                          style={styles.courseGradeDisplay}
                          onPress={() => {
                            setEditingCourseId(item.id);
                            setCourseGradeInput(
                              item.grade !== undefined ? String(item.grade) : ""
                            );
                          }}
                        >
                          <Text style={styles.courseGradeText}>
                            {item.grade !== undefined
                              ? `${item.grade}%`
                              : "Set Grade"}
                          </Text>
                          <Ionicons
                            name="create-outline"
                            size={16}
                            color="#666"
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.gradeHistoryButton}
                          onPress={() => openGradeHistoryModal(item.id)}
                        >
                          <Ionicons
                            name="analytics-outline"
                            size={14}
                            color="#3b82f6"
                          />
                          <Text style={styles.gradeHistoryButtonText}>
                            Grade History ({item.gradeHistory?.length || 0})
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {/* Show trend button */}
                <TouchableOpacity
                  style={styles.trendButton}
                  onPress={() => toggleCourseExpanded(item.id)}
                >
                  <Text style={styles.trendButtonText}>
                    {expandedCourses[item.id]
                      ? "Hide Grade Trend"
                      : "Show Grade Trend"}
                  </Text>
                  <Ionicons
                    name={
                      expandedCourses[item.id] ? "chevron-up" : "chevron-down"
                    }
                    size={16}
                    color="#3b82f6"
                  />
                </TouchableOpacity>

                {/* Expanded grade trend chart */}
                {expandedCourses[item.id] && (
                  <View style={styles.expandedGradeContent}>
                    <GradeTrendChart
                      course={item}
                      assignments={assignments.filter(
                        (a) => a.courseId === item.id && a.grade !== undefined
                      )}
                    />
                  </View>
                )}

                {/* Action buttons */}
                <View style={styles.courseCardActions}>
                  <TouchableOpacity
                    style={[styles.courseAction, styles.studyAction]}
                    onPress={() => openStudyModal(item.id)}
                  >
                    <Ionicons name="time" size={16} color="#3b82f6" />
                    <Text style={styles.studyActionText}>Log Study</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.courseAction, styles.deleteAction]}
                    onPress={() => confirmDeleteCourse(item.id, item.name)}
                  >
                    <Ionicons name="trash" size={16} color="#ff6b6b" />
                    <Text style={styles.deleteActionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    );
  }

  function formatTimestamp(timestamp: string | null): string {
    if (!timestamp) return "Never generated";

    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderInsightsTab() {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.insightsContainer}>
          <View style={styles.insightsHeader}>
            <Ionicons name="bulb" size={24} color="#f59e0b" />
            <Text style={styles.insightsTitle}>AI Productivity Insights</Text>
          </View>

          <View style={styles.lastGeneratedContainer}>
            <Text style={styles.lastGeneratedText}>
              Last generated: {formatTimestamp(lastSuggestionTime)}
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={fetchAISuggestions}
              disabled={loadingSuggestions}
            >
              <Ionicons
                name={loadingSuggestions ? "hourglass" : "refresh"}
                size={18}
                color="#fff"
              />
              <Text style={styles.refreshButtonText}>
                {loadingSuggestions ? "Generating..." : "Generate New Insights"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.insightsBody}>
            {loadingSuggestions ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Analyzing your data...</Text>
              </View>
            ) : !aiSuggestions ? (
              <View style={styles.emptyInsights}>
                <Text style={styles.emptyInsightsText}>
                  No insights yet. Click "Generate New Insights" to get
                  personalized suggestions.
                </Text>
              </View>
            ) : (
              <Text style={styles.insightsText}>{aiSuggestions}</Text>
            )}
          </View>
        </View>

        <View style={styles.insightsDashboard}>
          <Text style={styles.dashboardTitle}>Performance Overview</Text>

          {/* Summary stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statBlock}>
              <Text style={styles.statBlockLabel}>Courses</Text>
              <Text style={styles.statBlockValue}>{courses.length}</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statBlockLabel}>Assignments</Text>
              <Text style={styles.statBlockValue}>{assignments.length}</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statBlockLabel}>Completed</Text>
              <Text style={styles.statBlockValue}>
                {assignments.filter((a) => a.completed).length}
              </Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statBlockLabel}>Study Hours</Text>
              <Text style={styles.statBlockValue}>
                {(
                  sessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60
                ).toFixed(1)}
              </Text>
            </View>
          </View>

          {/* Upcoming deadlines */}
          <Text style={styles.dashboardSubtitle}>Upcoming Deadlines</Text>
          {assignments
            .filter((a) => new Date(a.dueDate) > new Date() && !a.completed)
            .sort(
              (a, b) =>
                new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            )
            .slice(0, 3)
            .map((assignment) => (
              <View key={assignment.id} style={styles.upcomingDeadline}>
                <View style={styles.deadlineInfo}>
                  <Text style={styles.deadlineTitle}>{assignment.title}</Text>
                  <Text style={styles.deadlineCourse}>
                    {getCourseName(assignment.courseId)}
                  </Text>
                </View>
                <Text style={styles.deadlineDate}>
                  {formatDate(assignment.dueDate)}
                </Text>
              </View>
            ))}
        </View>
      </ScrollView>
    );
  }

  function formatDate(dateString: string): string {
    if (!dateString) {
      return "No Date";
    }

    let date: Date;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const parts = dateString.split("-");
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      date = new Date(year, month, day);
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    return date.toDateString();
  }

  function getColorForCourse(courseId: string) {
    const colors = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#ef4444",
      "#ec4899",
      "#06b6d4",
    ];
    const index = parseInt(courseId, 36) % colors.length;
    return colors[index];
  }

  function toggleCourseExpanded(courseId: string) {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  }

  function openGradeHistoryModal(courseId: string) {
    setSelectedCourseForGradeHistory(courseId);
    setNewGradePoint({
      date: new Date().toISOString().split("T")[0],
      grade: "",
    });
    setGradeHistoryModalVisible(true);
  }

  function addGradeHistoryPoint() {
    if (!selectedCourseForGradeHistory || !newGradePoint.grade) return;

    const numericGrade = Number(newGradePoint.grade);
    if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > 100) return;

    const course = courses.find((c) => c.id === selectedCourseForGradeHistory);
    if (!course) return;

    const newGradeHistory = [
      ...(course.gradeHistory || []),
      {
        date: newGradePoint.date,
        grade: numericGrade,
      },
    ];

    updateCourseGradeHistory(selectedCourseForGradeHistory, newGradeHistory);

    setNewGradePoint({
      date: new Date().toISOString().split("T")[0],
      grade: "",
    });
  }

  function deleteGradePoint(courseId: string, pointIndex: number) {
    const course = courses.find((c) => c.id === courseId);
    if (!course || !course.gradeHistory) return;

    const updatedHistory = [...course.gradeHistory];
    updatedHistory.splice(pointIndex, 1);

    updateCourseGradeHistory(courseId, updatedHistory);
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    ...(Platform.OS === "web" && { zIndex: 1000 }),
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 4,
    ...(Platform.OS === "web" && { zIndex: 0 }),
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#888",
  },
  activeTabText: {
    color: "#3b82f6",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  completedCard: {
    backgroundColor: "#f0fdf4",
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  courseIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  cardTitleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaIcon: {
    marginRight: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#4b5563",
  },
  overdueText: {
    color: "#ef4444",
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  incompleteButton: {
    backgroundColor: "#f1f5f9",
  },
  completedButton: {
    backgroundColor: "#dcfce7",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  incompleteButtonText: {
    color: "#666",
  },
  completedButtonText: {
    color: "#16a34a",
  },
  rightActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#f8fafc",
  },
  expandedContent: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  descriptionBox: {
    marginBottom: 12,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: "#4b5563",
  },
  sessionsBox: {
    marginTop: 8,
  },
  sessionsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 6,
  },
  noSessionsText: {
    fontSize: 13,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 8,
  },
  sessionDate: {
    fontSize: 13,
    color: "#4b5563",
    fontWeight: "500",
    flex: 1,
  },
  sessionDuration: {
    fontSize: 13,
    color: "#4b5563",
    fontWeight: "500",
  },
  sessionNotes: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 6,
    flex: 1,
  },
  inlineForm: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  inlineFormTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 8,
  },
  gradeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  gradeInput: {
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    width: 60,
    color: "#111827",
  },
  percentSign: {
    fontSize: 16,
    color: "#64748b",
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelButtonText: {
    color: "#64748b",
    fontWeight: "500",
    fontSize: 14,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#94a3b8",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
  },

  studyStatsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 8,
    marginTop: 16,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  statTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4b5563",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  courseStatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  courseStatName: {
    width: 80,
    fontSize: 14,
    fontWeight: "500",
    color: "#4b5563",
  },
  courseStatTime: {
    width: 60,
    fontSize: 14,
    color: "#4b5563",
    textAlign: "right",
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    marginHorizontal: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
  },
  logButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#e0f2fe",
    borderRadius: 6,
  },
  logButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#3b82f6",
  },
  sessionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sessionCardHeader: {
    marginBottom: 12,
  },
  sessionCardCourse: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  sessionCardDate: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  sessionCardDetails: {
    gap: 6,
  },
  sessionCardTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sessionCardDuration: {
    fontSize: 14,
    color: "#4b5563",
  },
  sessionCardNotes: {
    fontSize: 14,
    color: "#64748b",
    fontStyle: "italic",
  },
  sessionDeleteButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  courseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginVertical: 12,
  },
  addCourseButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  addCourseButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  courseCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  courseCardContent: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  courseColorIndicator: {
    width: 4,
    borderRadius: 2,
    alignSelf: "stretch",
  },
  courseName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  courseStats: {
    flexDirection: "column",
    gap: 6,
  },
  courseStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  courseStatText: {
    fontSize: 13,
    color: "#64748b",
  },
  courseGradeContainer: {
    alignItems: "center",
  },
  courseGradeLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  courseGradeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 6,
  },
  courseGradeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  courseGradeEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  courseGradeInput: {
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    width: 60,
    textAlign: "center",
  },
  courseCardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  courseAction: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  studyAction: {
    borderRightWidth: 1,
    borderRightColor: "#f1f5f9",
  },
  studyActionText: {
    color: "#3b82f6",
    fontWeight: "500",
  },
  deleteAction: {
    borderLeftWidth: 1,
    borderLeftColor: "#f1f5f9",
  },
  deleteActionText: {
    color: "#ff6b6b",
    fontWeight: "500",
  },

  insightsContainer: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  insightsBody: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
  },
  insightsText: {
    fontSize: 15,
    color: "#1f2937",
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  loadingText: {
    color: "#64748b",
    fontSize: 15,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  refreshButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  insightsDashboard: {
    padding: 16,
  },
  dashboardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statBlock: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statBlockLabel: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 4,
  },
  statBlockValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  dashboardSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  upcomingDeadline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  deadlineCourse: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  deadlineDate: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3b82f6",
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#3b82f6",
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 500,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
    marginBottom: 6,
    marginTop: 4,
  },
  courseSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#e0f2fe",
    marginRight: 8,
  },
  courseSelectBtnActive: {
    backgroundColor: "#3b82f6",
  },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  addCourseBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },

  datePickerContainer: {
    marginBottom: 12,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  datePickerButtonText: {
    fontSize: 15,
    color: "#111827",
  },
  iosDatePicker: {
    backgroundColor: "white",
    width: "100%",
    height: 180,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  iosPickerConfirmButton: {
    backgroundColor: "white",
    position: "absolute",
    bottom: 180,
    right: 0,
    padding: 10,
    zIndex: 1000,
  },
  inlineDatePickerContainer: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
  },
  inlineDatePicker: {
    width: "100%",
    height: 50,
  },
  lastGeneratedContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  lastGeneratedText: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 10,
    fontStyle: "italic",
  },
  emptyInsights: {
    padding: 24,
    alignItems: "center",
  },
  emptyInsightsText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 15,
    lineHeight: 22,
  },
  sessionCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sessionCardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    marginTop: 12,
    paddingTop: 12,
  },
  deleteButtonText: {
    fontSize: 13,
    color: "#ff6b6b",
    fontWeight: "500",
  },
  sortContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    position: "relative",
    zIndex: 10,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  sortButtonText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  sortOptionsContainer: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
    padding: 8,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeSortOption: {
    backgroundColor: "#f0f9ff",
  },
  sortOptionText: {
    fontSize: 15,
    color: "#4b5563",
  },
  activeSortOptionText: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  trendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  trendButtonText: {
    color: "#3b82f6",
    fontWeight: "500",
    fontSize: 14,
  },
  expandedGradeContent: {
    paddingTop: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3b82f6",
    marginBottom: 16,
  },
  gradeHistoryForm: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  gradePointInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  dateInputContainer: {
    flex: 2,
  },
  gradeInputContainer: {
    flex: 1,
  },
  inputLabelSmall: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  gradeHistoryInput: {
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  addGradePointButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 6,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeHistoryList: {
    maxHeight: 250,
  },
  gradeHistoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  gradeHistoryItemContent: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-between",
    marginRight: 12,
  },
  gradeHistoryDate: {
    fontSize: 14,
    color: "#4b5563",
  },
  gradeHistoryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  noDataText: {
    color: "#94a3b8",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
  modalActions: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
    marginTop: 8,
    alignItems: "flex-end",
  },
  modalCloseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalCloseButtonText: {
    color: "#64748b",
    fontWeight: "500",
  },
  gradeHistoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 4,
    marginTop: 4,
  },
  gradeHistoryButtonText: {
    color: "#3b82f6",
    fontSize: 12,
    fontWeight: "500",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    ...(Platform.OS === "web" && { zIndex: 1 }),
  },
});
