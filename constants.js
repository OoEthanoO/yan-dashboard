import { version } from "./package.json";

// Add this to detect environment for mobile
export const detectEnvironment = () => {
  // This is for development purposes on mobile where hostname detection isn't applicable
  // You can modify this logic based on how your mobile app determines its environment
  console.log("Detected environment:", process.env.EXPO_PUBLIC_APP_ENV);
  return process.env.EXPO_PUBLIC_APP_ENV || "production"; // Options: 'alpha', 'beta', 'rc', 'production'
};

export const APP_VERSION = version;
export const APP_NAME = "Yan Dashboard";
export const APP_FULL_VERSION = `${APP_NAME} v${APP_VERSION}`;
export const APP_BUILD_DATE = "2025-05-25";
export const APP_ENVIRONMENT = detectEnvironment();
