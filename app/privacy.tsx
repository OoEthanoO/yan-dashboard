import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacyScreen() {
  const router = useRouter();

  const openGitHub = async () => {
    const repoUrl = "https://github.com/ooethanoo/yan-dashboard";
    await WebBrowser.openBrowserAsync(repoUrl);
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
        <Text style={styles.headerTitle}>Privacy & Data Protection</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Ionicons
            name="lock-closed"
            size={32}
            color="#3b82f6"
            style={styles.sectionIcon}
          />
          <Text style={styles.sectionTitle}>End-to-End Encryption</Text>
          <Text style={styles.sectionText}>
            Your academic data is encrypted on your device before being sent to
            our servers. This means even we cannot see your actual grades or
            personal information.
          </Text>
        </View>

        <View style={styles.section}>
          <Ionicons
            name="shield-checkmark"
            size={32}
            color="#3b82f6"
            style={styles.sectionIcon}
          />
          <Text style={styles.sectionTitle}>Data Storage</Text>
          <Text style={styles.sectionText}>
            Your encrypted data is stored securely in our database and is only
            accessible by you. Your password is hashed and cannot be recovered
            by anyone, including our team.
          </Text>
        </View>

        <View style={styles.section}>
          <Ionicons
            name="analytics"
            size={32}
            color="#3b82f6"
            style={styles.sectionIcon}
          />
          <Text style={styles.sectionTitle}>AI Processing</Text>
          <Text style={styles.sectionText}>
            When providing personalized suggestions, your data is temporarily
            decrypted in a secure environment accessible only to our AI system.
            The AI does not store your data after processing.
          </Text>
        </View>

        <View style={styles.section}>
          <Ionicons
            name="code-slash"
            size={32}
            color="#3b82f6"
            style={styles.sectionIcon}
          />
          <Text style={styles.sectionTitle}>Open Source</Text>
          <Text style={styles.sectionText}>
            Our encryption implementation is open source and can be reviewed on
            GitHub. This transparency ensures that our privacy claims can be
            independently verified.
          </Text>

          <TouchableOpacity style={styles.githubButton} onPress={openGitHub}>
            <Ionicons name="logo-github" size={20} color="#fff" />
            <Text style={styles.githubButtonText}>View Source Code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Ionicons
            name="trash-bin"
            size={32}
            color="#3b82f6"
            style={styles.sectionIcon}
          />
          <Text style={styles.sectionTitle}>Data Deletion</Text>
          <Text style={styles.sectionText}>
            You can request complete deletion of your account and all associated
            data at any time through the Account Settings page.
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
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionIcon: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
    textAlign: "center",
  },
  sectionText: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
    textAlign: "center",
  },
  githubButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#24292e",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  githubButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
