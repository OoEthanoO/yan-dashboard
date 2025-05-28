import { ApiClient } from "@/services/api-client";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DisclaimerModal from "../components/DisclaimerModal";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugTapCount, setDebugTapCount] = useState(0);

  const { login, register, loading } = useAuth();

  useEffect(() => {
    const loadDebugMode = async () => {
      const isDebug = await ApiClient.isDebugMode();
      setDebugMode(isDebug);
    };
    loadDebugMode();
  }, []);

  const toggleDebugMode = async () => {
    const newMode = !debugMode;
    await ApiClient.setDebugMode(newMode);
    setDebugMode(newMode);
  };

  const handleVersionTap = () => {
    setDebugTapCount((prev) => {
      if (prev >= 6) {
        toggleDebugMode();
        return 0;
      }
      return prev + 1;
    });
  };

  async function handleSubmit() {
    setError(null);

    // Validate inputs
    if (!email || !password || (!isLogin && !name)) {
      setError("All fields are required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Password validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
        // If we reach here, login was successful, error will be cleared by successful navigation
      } else {
        // Name validation for registration
        if (name.trim().length < 2) {
          setError("Name must be at least 2 characters long");
          return;
        }
        await register(email, password, name);
      }
    } catch (err: any) {
      console.error("Authentication error:", err);

      // Handle specific error messages
      let errorMessage = "Authentication failed";

      if (err instanceof Error) {
        // Check for specific error messages from the server
        if (
          err.message.includes("Invalid credentials") ||
          err.message.includes("Invalid email or password") ||
          err.message.includes("Unauthorized")
        ) {
          console.log("Invalid credentials error detected");
          errorMessage = isLogin
            ? "Invalid email or password. Please check your credentials and try again."
            : "Registration failed. Please try again.";
        } else if (err.message.includes("Email already in use")) {
          errorMessage =
            "An account with this email already exists. Please sign in instead.";
        } else if (err.message.includes("User not found")) {
          errorMessage = "No account found with this email address.";
        } else if (
          err.message.includes("Network") ||
          err.message.includes("fetch")
        ) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else if (
          err.message.includes("Server error") ||
          err.message.includes("500")
        ) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage = err.message || "Authentication failed";
        }
      }

      // Set error and ensure it stays visible
      setError(errorMessage);
      console.log("Error message set:", errorMessage);

      // Use setTimeout to ensure error persists and show alert as backup
      // setTimeout(() => {
      //   if (errorMessage.includes("Invalid email or password")) {
      //     Alert.alert("Login Failed", errorMessage, [
      //       { text: "OK", style: "default" },
      //     ]);
      //   }
      // }, 100);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Ionicons name="school" size={48} color="#3b82f6" />
          <Text style={styles.appName}>Yan Dashboard</Text>
          <Text style={styles.subtitle}>Your academic companion</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>
            {isLogin ? "Welcome Back" : "Create Account"}
          </Text>

          {error && (
            <View
              style={[
                styles.errorContainer,
                error.includes("Invalid email or password") &&
                  styles.criticalErrorContainer,
              ]}
            >
              <Ionicons
                name="alert-circle"
                size={18}
                color={
                  error.includes("Invalid email or password")
                    ? "#dc2626"
                    : "#ef4444"
                }
              />
              <Text
                style={[
                  styles.error,
                  error.includes("Invalid email or password") &&
                    styles.criticalError,
                ]}
              >
                {error}
              </Text>
            </View>
          )}

          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError(null); // Clear error when user starts typing
              }}
              autoCapitalize="words"
              placeholderTextColor="#aaa"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError(null); // Clear error when user starts typing
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#aaa"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError(null); // Clear error when user starts typing
            }}
            secureTextEntry
            placeholderTextColor="#aaa"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? "Sign In" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setIsLogin(!isLogin);
              setError(null); // Clear error when switching modes
            }}
          >
            <Text style={styles.switchButtonText}>
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.disclaimerButton}
            onPress={() => setDisclaimerVisible(true)}
          >
            <Ionicons name="shield-outline" size={16} color="#64748b" />
            <Text style={styles.disclaimerText}>Privacy & Data Policy</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleVersionTap}>
            <Text style={styles.footerText}>
              © {new Date().getFullYear()} Yan Dashboard
              {debugMode && " (Debug)"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Disclaimer Modal */}
      <DisclaimerModal
        visible={disclaimerVisible}
        onClose={() => setDisclaimerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: "space-between",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 30,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  switchButton: {
    marginTop: 20,
    alignItems: "center",
  },
  switchButtonText: {
    color: "#3b82f6",
    fontSize: 14,
  },
  disclaimerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  disclaimerText: {
    color: "#64748b",
    fontSize: 14,
    marginLeft: 6,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  criticalErrorContainer: {
    backgroundColor: "#fef1f1",
    borderColor: "#f87171",
    shadowColor: "#dc2626",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  error: {
    color: "#ef4444",
    marginLeft: 6,
    fontSize: 14,
    flex: 1,
  },
  criticalError: {
    color: "#dc2626",
    fontWeight: "500",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
