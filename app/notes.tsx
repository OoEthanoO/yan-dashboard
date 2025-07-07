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

const NoteList = ({
  notes,
  selectedNote,
  handleSelectNote,
  handleNewNote,
  isWideScreen,
}: {
  notes: Note[];
  selectedNote: Note | null;
  handleSelectNote: (note: Note) => void;
  handleNewNote: () => void;
  isWideScreen: boolean;
}) => (
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

const NoteDetail = ({
  selectedNote,
  handleUpdateNote,
}: {
  selectedNote: Note | null;
  handleUpdateNote: (field: "title" | "content", value: string) => void;
}) => {
  const [content, setContent] = useState(selectedNote?.content || "");
  const textInputRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    setContent(selectedNote?.content || "");
  }, [selectedNote]);

  const handleContentChange = (newText: string) => {
    const lines = newText.split("\n");
    const oldLines = content.split("\n");
    let transformedText = newText;

    if (lines.length >= oldLines.length && newText.length > content.length) {
      const lastLine = lines[lines.length - 1];

      const lastChar = newText[newText.length - 1];
      if (lastChar === " ") {
        const trimmedLine = lastLine.trim();
        if (trimmedLine === "-" || trimmedLine === "*") {
          const dashIndex = lastLine.indexOf(trimmedLine);
          if (dashIndex !== -1) {
            const newLine =
              lastLine.substring(0, dashIndex) +
              "  •" +
              lastLine.substring(dashIndex + 1);
            lines[lines.length - 1] = newLine;
            transformedText = lines.join("\n");
          }
        }
      }
    }

    setContent(transformedText);
    handleUpdateNote("content", transformedText);
  };

  const handleKeyPress = (e: any) => {
    if (Platform.OS !== "web") return;

    if (e.nativeEvent.key === "Tab" && selectedNote) {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.target as any;
      const lines = content.split("\n");
      const lineIndex =
        content.substring(0, selectionStart).split("\n").length - 1;

      if (e.nativeEvent.shiftKey) {
        if (lines[lineIndex].startsWith("  ")) {
          lines[lineIndex] = lines[lineIndex].substring(2);
        }
      } else {
        lines[lineIndex] = "\t" + lines[lineIndex];
      }

      const newValue = lines.join("\n");
      setContent(newValue);
      handleUpdateNote("content", newValue);
    } else if (e.nativeEvent.key === "Backspace" && selectedNote) {
      const { selectionStart, selectionEnd } = e.target as any;

      if (selectionStart === selectionEnd) {
        const lines = content.split("\n");
        const lineIndex =
          content.substring(0, selectionStart).split("\n").length - 1;
        const currentLine = lines[lineIndex];
        const cursorPosInLine =
          selectionStart -
          content.substring(0, selectionStart).lastIndexOf("\n") -
          1;

        if (
          currentLine.match(/^(\s*)  • $/) &&
          cursorPosInLine === currentLine.length
        ) {
          e.preventDefault();
          const indent = currentLine.match(/^(\s*)/)?.[1] || "";
          const adjustedIndent = indent.length >= 2 ? indent.substring(2) : "";
          lines[lineIndex] = adjustedIndent + "\t";

          const newValue = lines.join("\n");
          setContent(newValue);
          handleUpdateNote("content", newValue);

          setTimeout(() => {
            const newCursorPos =
              content.substring(0, selectionStart).lastIndexOf("\n") +
              1 +
              adjustedIndent.length +
              1;

            if (Platform.OS === "web") {
              const target = e.target as HTMLTextAreaElement;
              if (target && target.setSelectionRange) {
                target.setSelectionRange(newCursorPos, newCursorPos);
              }
            } else if (textInputRef.current) {
              textInputRef.current.setNativeProps({
                selection: { start: newCursorPos, end: newCursorPos },
              });
            }
          }, 0);
        }
      }
    } else if (e.nativeEvent.key === "Enter" && selectedNote) {
      const { selectionStart } = e.target as any;
      const currentLine =
        content.substring(0, selectionStart).split("\n").pop() || "";
      const indentMatch = currentLine.match(/^(\s*)/);
      const bulletMatch = currentLine.match(/^(\s*  • )/);

      if (bulletMatch) {
        e.preventDefault();
        const indent = indentMatch ? indentMatch[1] : "";
        const newContent =
          content.substring(0, selectionStart) +
          `\n${indent}  • ` +
          content.substring(selectionStart);
        setContent(newContent);
        handleUpdateNote("content", newContent);
      }
    }
  };

  return (
    <View style={styles.noteDetailContainer}>
      {selectedNote ? (
        <>
          <TextInput
            style={styles.detailTitleInput}
            value={selectedNote.title}
            onChangeText={(text) => handleUpdateNote("title", text)}
            placeholder="Note Title"
            placeholderTextColor="#d1d5db"
          />
          <View style={styles.detailContentWrapper}>
            <TextInput
              ref={textInputRef}
              style={styles.detailContentInput}
              value={content}
              onChangeText={handleContentChange}
              multiline
              placeholder="Start writing your note... Type '-' or '*' and a space for a bullet point."
              placeholderTextColor="#9ca3af"
              onKeyPress={handleKeyPress}
            />
          </View>
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
};

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
              <NoteList
                notes={notes}
                selectedNote={selectedNote}
                handleSelectNote={handleSelectNote}
                handleNewNote={handleNewNote}
                isWideScreen={isWideScreen}
              />
              <NoteDetail
                selectedNote={selectedNote}
                handleUpdateNote={handleUpdateNote}
              />
            </>
          ) : selectedNote ? (
            <NoteDetail
              selectedNote={selectedNote}
              handleUpdateNote={handleUpdateNote}
            />
          ) : (
            <NoteList
              notes={notes}
              selectedNote={selectedNote}
              handleSelectNote={handleSelectNote}
              handleNewNote={handleNewNote}
              isWideScreen={isWideScreen}
            />
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
    lineHeight: 28,
    color: "#334155",
    textAlignVertical: "top",
    fontFamily: Platform.OS === "web" ? "Menlo" : "monospace",
    ...(Platform.OS === "web" && {
      tabSize: 4,
      MozTabSize: 4,
    }),
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
