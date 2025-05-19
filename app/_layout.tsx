import { CoursesProvider } from "@/context/CoursesContext";
import { Stack } from "expo-router";
import { AssignmentsProvider } from "../context/AssignmentsContext";
import { StudySessionsProvider } from "../context/StudySessionsContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ActivityIndicator, View } from "react-native";
import LoginScreen from "@/screens/LoginScreen";
import ProfileBar from "@/components/ProfileBar";

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
              headerRight: () => <ProfileBar />,
              headerLeft: () => null,
              headerStyle: {
                backgroundColor: "#fff",
              },
              headerShadowVisible: false,
              headerTitle: "",
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
