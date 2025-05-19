import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

type DisclaimerModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function DisclaimerModal({
  visible,
  onClose,
}: DisclaimerModalProps) {
  const openGitHub = async () => {
    const repoUrl = "https://github.com/ooethanoo/yan-dashboard";
    await WebBrowser.openBrowserAsync(repoUrl);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Privacy & Data Security</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <Ionicons
                name="lock-closed"
                size={28}
                color="#3b82f6"
                style={styles.icon}
              />
              <Text style={styles.sectionTitle}>Your Data is Private</Text>
              <Text style={styles.text}>
                As the developer of this app, I cannot see your passwords,
                grades, or any academic data you enter.
              </Text>
            </View>

            <View style={styles.section}>
              <Ionicons
                name="shield-checkmark"
                size={28}
                color="#3b82f6"
                style={styles.icon}
              />
              <Text style={styles.sectionTitle}>End-to-End Encryption</Text>
              <Text style={styles.text}>
                • Your grade data is encrypted directly on your device
              </Text>
              <Text style={styles.text}>
                • Encrypted data is stored securely in our database
              </Text>
              <Text style={styles.text}>
                • Only the AI model can decrypt the data for analysis
              </Text>
              <Text style={styles.text}>
                • Even as the developer, I cannot access your actual grades
              </Text>
            </View>

            <View style={styles.section}>
              <Ionicons
                name="analytics-outline"
                size={28}
                color="#3b82f6"
                style={styles.icon}
              />
              <Text style={styles.sectionTitle}>How the AI Helps You</Text>
              <Text style={styles.text}>
                The AI analyzes your encrypted academic data within a secure
                environment to provide personalized study suggestions, without
                exposing your actual grades to anyone.
              </Text>
            </View>

            <View style={styles.section}>
              <Ionicons
                name="key-outline"
                size={28}
                color="#3b82f6"
                style={styles.icon}
              />
              <Text style={styles.sectionTitle}>Your Access Control</Text>
              <Text style={styles.text}>
                You always maintain full control over your data. You can delete
                your account and all associated data at any time.
              </Text>
            </View>

            <View style={styles.section}>
              <Ionicons
                name="logo-github"
                size={28}
                color="#3b82f6"
                style={styles.icon}
              />
              <Text style={styles.sectionTitle}>Verify Our Claims</Text>
              <Text style={styles.text}>
                Don't trust these claims? This app is open source! You can
                review the code yourself to verify how your data is encrypted
                and protected.
              </Text>
              <TouchableOpacity
                style={styles.githubButton}
                onPress={openGitHub}
              >
                <Ionicons name="code-slash-outline" size={16} color="#fff" />
                <Text style={styles.githubButtonText}>
                  View Source Code on GitHub
                </Text>
              </TouchableOpacity>
              <Text style={styles.smallText}>
                The encryption implementation can be found in the
                secure-decryption.js and encryption-service.js files.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>I Understand</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: "80%",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    maxHeight: 400,
  },
  section: {
    marginBottom: 24,
  },
  icon: {
    marginBottom: 12,
    alignSelf: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  text: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  githubButton: {
    backgroundColor: "#24292e",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "center",
  },
  githubButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 8,
  },
  smallText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    fontStyle: "italic",
  },
});
