import ProfileBar from "@/components/ProfileBar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const dummyNotes = [
  {
    id: "1",
    title: "Lecture Notes - Chapter 5",
    content:
      "Key concepts from today's lecture on Advanced Algorithms. Covered topics include dynamic programming, greedy algorithms, and complexity analysis. Need to review the section on NP-completeness.",
    course: "CS 501",
    lastModified: "2 hours ago",
  },
  {
    id: "2",
    title: "Project Brainstorming",
    content:
      "Ideas for the final project:\n- A mobile app for student productivity.\n- A web-based tool for data visualization.\n- An IoT device for smart home automation.",
    course: "Senior Project",
    lastModified: "1 day ago",
  },
  {
    id: "3",
    title: "Reading Summary: The Pragmatic Programmer",
    content:
      "Finished reading the first three chapters. Important takeaways:\n- The importance of writing clean, maintainable code.\n- The 'Don't Repeat Yourself' (DRY) principle.\n- The value of using version control systems.",
    course: "Software Engineering",
    lastModified: "3 days ago",
  },
];

type Note = (typeof dummyNotes)[0];

export default function NotesScreen() {
  const router = useRouter();
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [notes, setNotes] = useState(dummyNotes);
  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0]);
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
  };

  const handleUpdateNote = (field: "title" | "content", value: string) => {
    if (!selectedNote) return;

    const updatedNotes = notes.map((note) => {
      if (note.id === selectedNote.id) {
        return {
          ...note,
          [field]: value,
          lastModified: "Just now",
        };
      }
      return note;
    });

    setNotes(updatedNotes);
    setSelectedNote((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleNewNote = () => {
    const newNote: Note = {
      id: String(Date.now()),
      title: "New Note",
      content: "",
      course: "General",
      lastModified: "Just now",
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
  };

  const NoteList = () => (
    <View
      style={[
        styles.noteListContainer,
        isWideScreen && styles.noteListContainerWide,
      ]}
    >
      <View style={styles.noteListHeader}>
        <Text style={styles.noteListTitle}>All Notes</Text>
        <TouchableOpacity style={styles.newNoteButton} onPress={handleNewNote}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newNoteButtonText}>New Note</Text>
        </TouchableOpacity>
      </View>
      <ScrollView>
        {notes.map((note) => (
          <TouchableOpacity
            key={note.id}
            style={[
              styles.noteItem,
              selectedNote?.id === note.id && styles.selectedNoteItem,
            ]}
            onPress={() => handleSelectNote(note)}
          >
            <Text style={styles.noteTitle}>{note.title}</Text>
            <Text style={styles.noteSnippet} numberOfLines={2}>
              {note.content}
            </Text>
            <View style={styles.noteFooter}>
              <Text style={styles.noteCourse}>{note.course}</Text>
              <Text style={styles.noteDate}>{note.lastModified}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const NoteDetail = () => (
    <View style={styles.noteDetailContainer}>
      {selectedNote ? (
        <>
          <TextInput
            style={styles.detailTitleInput}
            value={selectedNote.title}
            onChangeText={(text) => handleUpdateNote("title", text)}
            placeholder="Note Title"
            placeholderTextColor="#aaa"
          />
          <ScrollView style={styles.detailContentWrapper}>
            <TextInput
              style={styles.detailContentInput}
              value={selectedNote.content}
              onChangeText={(text) => handleUpdateNote("content", text)}
              multiline
              placeholder="Start writing your note..."
              placeholderTextColor="#aaa"
            />
          </ScrollView>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyStateText}>Select a note to view</Text>
          <Text style={styles.emptyStateSubtext}>
            Or create a new one to get started
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <TouchableOpacity
                style={styles.navDropdownButton}
                onPress={() => setShowNavMenu(!showNavMenu)}
              >
                <Text style={styles.headerTitle}>Notes</Text>
                <Ionicons
                  name={showNavMenu ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#111827"
                />
              </TouchableOpacity>
              {showNavMenu && (
                <View style={styles.navDropdownMenu}>
                  <TouchableOpacity
                    style={styles.navMenuItem}
                    onPress={() => {
                      setShowNavMenu(false);
                      router.push("/");
                    }}
                  >
                    <Text style={styles.navMenuItemText}>Dashboard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.navMenuItem, styles.navMenuItemActive]}
                    onPress={() => setShowNavMenu(false)}
                  >
                    <Text style={styles.navMenuItemText}>Notes</Text>
                    <Ionicons name="checkmark" size={16} color="#3b82f6" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <ProfileBar />
          </View>
        </View>
        <View style={styles.mainContent}>
          {isWideScreen ? (
            <>
              <NoteList />
              <NoteDetail />
            </>
          ) : selectedNote ? (
            <NoteDetail />
          ) : (
            <NoteList />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  navDropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navDropdownMenu: {
    position: "absolute",
    top: 40,
    left: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
    zIndex: 2000,
    width: 200,
    padding: 8,
  },
  navMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  navMenuItemActive: {
    backgroundColor: "#f0f9ff",
  },
  navMenuItemText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  mainContent: {
    flex: 1,
    flexDirection: "row",
  },
  noteListContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#f1f5f9",
  },
  noteListContainerWide: {
    flex: 0,
    minWidth: 300,
    maxWidth: 400,
  },
  noteListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  noteListTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  newNoteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  newNoteButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  noteItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  selectedNoteItem: {
    backgroundColor: "#f0f9ff",
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
    paddingLeft: 12,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
    marginBottom: 4,
  },
  noteSnippet: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  noteFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  noteCourse: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "500",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  noteDate: {
    fontSize: 12,
    color: "#94a3b8",
  },
  noteDetailContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  detailTitleInput: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 20,
    color: "#111827",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  detailContentWrapper: {
    flex: 1,
  },
  detailContentInput: {
    flex: 1,
    padding: 20,
    fontSize: 16,
    lineHeight: 24,
    color: "#334155",
    textAlignVertical: "top",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "500",
    color: "#94a3b8",
  },
  emptyStateSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: "#cbd5e1",
  },
});
