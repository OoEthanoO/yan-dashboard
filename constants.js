import { version } from "./package.json";

export const detectEnvironment = () => {
  console.log("Detected environment:", process.env.EXPO_PUBLIC_APP_ENV);
  return process.env.EXPO_PUBLIC_APP_ENV || "production";
};

export const APP_VERSION = version;
export const APP_NAME = "Yan Dashboard";
export const APP_FULL_VERSION = `${APP_NAME} v${APP_VERSION}`;
export const APP_BUILD_DATE = "2025-05-25";
export const APP_ENVIRONMENT = detectEnvironment();
