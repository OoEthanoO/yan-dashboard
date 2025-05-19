import AsyncStorage from "@react-native-async-storage/async-storage";
import { EncryptionService } from "./encryption-service";

const API_URL = "http://localhost:4000/api";
const AUTH_TOKEN_KEY = "auth_token";
const LAST_SYNC_KEY = "last_sync_time";

export class ApiClient {
  static async getToken() {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  }

  static async setToken(token) {
    if (token) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }

  static async getLastSyncTime() {
    const time = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return time ? new Date(time) : null;
  }

  static async setLastSyncTime(time) {
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date(time).toISOString());
  }

  static async request(endpoint, method = "GET", data = null) {
    const token = await this.getToken();

    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_URL}${endpoint}`, config);
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || "API request failed");
    }

    return responseData;
  }

  static async register(email, password, name) {
    const res = await this.request("/auth/register", "POST", {
      email,
      password,
      name,
    });
    await this.setToken(res.token);
    return res.user;
  }

  static async login(email, password) {
    const res = await this.request("/auth/login", "POST", { email, password });
    await this.setToken(res.token);
    return res.user;
  }

  static async logout() {
    await this.setToken(null);
  }

  static async getMe() {
    return await this.request("/auth/me");
  }

  static async syncData(assignments, courses, studySessions) {
    const lastSyncTime = (await this.getLastSyncTime()) || new Date(0);

    const encryptedAssignments =
      await EncryptionService.processAssignmentsForSync(assignments);
    const encryptedCourses = await EncryptionService.processCoursesForSync(
      courses
    );

    const response = await this.request("/sync", "POST", {
      assignments: encryptedAssignments,
      courses: encryptedCourses,
      studySessions,
      lastSyncTime,
    });

    await this.setLastSyncTime(response.lastSync);

    if (response.data?.assignments?.length) {
      response.data.assignments = await EncryptionService.decryptAssignments(
        response.data.assignments
      );
    }

    if (response.data?.courses?.length) {
      response.data.courses = await EncryptionService.decryptCourses(
        response.data.courses
      );
    }

    return response.data;
  }

  static async getAllData() {
    const response = await this.request("/data");

    if (response.assignments?.length) {
      response.assignments = await EncryptionService.decryptAssignments(
        response.assignments
      );
    }

    if (response.courses?.length) {
      response.courses = await EncryptionService.decryptCourses(
        response.courses
      );
    }

    return response;
  }

  static async getAiSuggestions(assignments, courses, studySessions) {
    const encryptedAssignments =
      await EncryptionService.processAssignmentsForSync(assignments);
    const encryptedCourses = await EncryptionService.processCoursesForSync(
      courses
    );

    return await this.request("/suggestions", "POST", {
      assignments: encryptedAssignments,
      courses: encryptedCourses,
      studySessions,
    });
  }

  static async updateUser(data) {
    const response = await this.request("/auth/update", "POST", data);
    return response.user;
  }
}
