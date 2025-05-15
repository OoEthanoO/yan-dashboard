import { CoursesProvider } from "@/context/CoursesContext";
import { Stack } from "expo-router";
import { AssignmentsProvider } from "../context/AssignmentsContext";
import { StudySessionsProvider } from "../context/StudySessionsContext";

export default function RootLayout() {
  return (
    <CoursesProvider>
      <AssignmentsProvider>
        <StudySessionsProvider>
          <Stack />
        </StudySessionsProvider>
      </AssignmentsProvider>
    </CoursesProvider>
  );
}
