import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CoursesProvider } from "@/context/CoursesContext";
import LoginScreen from "@/screens/LoginScreen";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import "react-native-get-random-values";
import { AssignmentsProvider } from "../context/AssignmentsContext";
import { StudySessionsProvider } from "../context/StudySessionsContext";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f8fafc",
        }}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <CoursesProvider>
      <AssignmentsProvider>
        <StudySessionsProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </StudySessionsProvider>
      </AssignmentsProvider>
    </CoursesProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
