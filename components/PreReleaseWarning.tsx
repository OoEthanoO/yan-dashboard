import { APP_ENVIRONMENT } from "@/constants";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type Environment = "alpha" | "beta" | "rc" | "production";

export default function PreReleaseWarning() {
  const [environment, setEnvironment] = useState<Environment>("production");

  useEffect(() => {
    setEnvironment(APP_ENVIRONMENT as Environment);
  }, []);

  if (environment === "production") {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        environment === "alpha" && styles.alphaContainer,
        environment === "beta" && styles.betaContainer,
        environment === "rc" && styles.rcContainer,
      ]}
    >
      <Text
        style={[
          styles.text,
          environment === "alpha" && styles.alphaText,
          environment === "beta" && styles.betaText,
          environment === "rc" && styles.rcText,
        ]}
      >
        {environment === "alpha" && "⚠️ ALPHA VERSION - UNSTABLE ⚠️"}
        {environment === "beta" && "⚠️ BETA VERSION - TESTING ONLY ⚠️"}
        {environment === "rc" && "RELEASE CANDIDATE"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  alphaContainer: {
    backgroundColor: "#7f1d1d", // dark red
    borderBottomWidth: 2,
    borderBottomColor: "#ef4444", // lighter red
  },
  betaContainer: {
    backgroundColor: "#854d0e", // dark amber
    borderBottomWidth: 2,
    borderBottomColor: "#eab308", // yellow
  },
  rcContainer: {
    backgroundColor: "#14532d", // dark green
    borderBottomWidth: 2,
    borderBottomColor: "#22c55e", // green
  },
  text: {
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  alphaText: {
    color: "#fecaca", // light red
  },
  betaText: {
    color: "#fef08a", // light yellow
  },
  rcText: {
    color: "#bbf7d0", // light green
  },
});
