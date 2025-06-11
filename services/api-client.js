import AsyncStorage from "@react-native-async-storage/async-storage";
import { EncryptionService } from "./encryption-service";

const DEBUG_MODE_KEY = "debug_mode";
const PROD_API_URL = "https://yan-dashboard.onrender.com/api";
const DEV_API_URL = "http://localhost:4000/api";
const AUTH_TOKEN_KEY = "auth_token";
const LAST_SYNC_KEY = "last_sync_time";
const LOCAL_LAST_UPDATE_KEY = "local_last_update_time";

export class ApiClient {
  static async isDebugMode() {
    const debugMode = await AsyncStorage.getItem(DEBUG_MODE_KEY);
    return debugMode === "true";
  }

  static async setDebugMode(enabled) {
    await AsyncStorage.setItem(DEBUG_MODE_KEY, enabled ? "true" : "false");
  }

  static async getIssuesData() {
    try {
      const baseUrl = await this.getApiUrl();
      const token = await this.getToken();

      const response = await fetch(`${baseUrl}/issues`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch issues data");
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching issues data:", error);
      return null;
    }
  }

  static async getApiUrl() {
    if (process.env.NODE_ENV === "production") {
      return "/api";
    }

    const isDebug = await this.isDebugMode();
    return isDebug ? DEV_API_URL : PROD_API_URL;
  }

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
    const API_URL = await this.getApiUrl();

    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
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

  static async syncData(
    assignments,
    courses,
    studySessions,
    localLastUpdateTime
  ) {
    const lastSyncTime = (await this.getLastSyncTime()) || new Date(0);

    const timestampedData = {
      assignments: await this.prepareItemsWithTimestamps(
        assignments,
        "assignments"
      ),
      courses: await this.prepareItemsWithTimestamps(courses, "courses"),
      studySessions: await this.prepareItemsWithTimestamps(
        studySessions,
        "studySessions"
      ),
    };

    let deletedAssignmentIds = [];
    try {
      const deletedIdsStr = await AsyncStorage.getItem("deleted_assignments");
      if (deletedIdsStr) {
        deletedAssignmentIds = JSON.parse(deletedIdsStr);
      }
    } catch (error) {
      console.error("Error retrieving deleted assignments:", error);
    }

    const encryptedAssignments =
      await EncryptionService.processAssignmentsForSync(
        timestampedData.assignments
      );
    const encryptedCourses = await EncryptionService.processCoursesForSync(
      timestampedData.courses
    );

    console.log("encryptedAssignments:", encryptedAssignments);

    const response = await this.request("/sync", "POST", {
      assignments: encryptedAssignments,
      courses: encryptedCourses,
      studySessions: timestampedData.studySessions,
      deletedAssignmentIds,
      lastSyncTime,
      localLastUpdateTime,
    });

    console.log("response:", response);

    await AsyncStorage.setItem("deleted_assignments", JSON.stringify([]));
    await this.setLastSyncTime(response.lastSync);

    if (response.serverLastUpdateTime) {
      await AsyncStorage.setItem(
        LOCAL_LAST_UPDATE_KEY,
        response.serverLastUpdateTime
      );
    }

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

    return {
      ...response.data,
      serverLastUpdateTime: response.serverLastUpdateTime,
    };
  }

  static async prepareItemsWithTimestamps(items, storageKey) {
    const timestampsStr = await AsyncStorage.getItem(
      `${storageKey}_timestamps`
    );
    const timestamps = timestampsStr ? JSON.parse(timestampsStr) : {};

    return items.map((item) => {
      return {
        ...item,
        _lastModified: timestamps[item.id] || new Date().toISOString(),
      };
    });
  }

  static async markAssignmentForDeletion(id) {
    try {
      let deletedIds = [];
      const deletedIdsStr = await AsyncStorage.getItem("deleted_assignments");

      if (deletedIdsStr) {
        deletedIds = JSON.parse(deletedIdsStr);
      }

      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
      }

      await AsyncStorage.setItem(
        "deleted_assignments",
        JSON.stringify(deletedIds)
      );
      return true;
    } catch (error) {
      console.error("Error marking assignment for deletion:", error);
      return false;
    }
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

  static async getVersionHistory() {
    const response = await this.request("/version-history");
    return response.versionHistory;
  }

  static async getAiSuggestions(
    assignments,
    courses,
    studySessions,
    studyPatterns,
    dateContext
  ) {
    const token = await this.getToken();
    const baseURL = await this.getApiUrl();

    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseURL}/suggestions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        assignments,
        courses,
        studySessions,
        studyPatterns,
        dateContext,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  static async updateUser(data) {
    const response = await this.request("/auth/update", "POST", data);
    return response.user;
  }

  static async createAssignment(assignment) {
    return await this.request("/assignments", "POST", assignment);
  }

  static async updateAssignment(id, updatedData) {
    return await this.request(`/assignments/${id}`, "PUT", updatedData);
  }

  static async deleteAssignment(id) {
    return await this.request(`/assignments/${id}`, "DELETE");
  }

  static async createCourse(course) {
    return await this.request("/courses", "POST", course);
  }

  static async updateCourse(id, updatedData) {
    return await this.request(`/courses/${id}`, "PUT", updatedData);
  }

  static async deleteCourse(id) {
    return await this.request(`/courses/${id}`, "DELETE");
  }

  static async createStudySession(session) {
    return await this.request("/study-sessions", "POST", session);
  }

  static async deleteStudySession(id) {
    return await this.request(`/study-sessions/${id}`, "DELETE");
  }

  static async updateUserEncryptionKey(encryptedKey) {
    return await this.request("/auth/encryption-key", "POST", { encryptedKey });
  }

  static async getUserEncryptionKey() {
    return await this.request("/auth/encryption-key");
  }

  static async isAdmin() {
    try {
      const response = await this.request("/auth/me");
      return response.user?.role === "admin";
    } catch (error) {
      return false;
    }
  }

  static async getAdminStats() {
    return await this.request("/admin/stats");
  }

  static async getAdminUsers() {
    return await this.request("/admin/users");
  }

  static async getAdminIssues() {
    return await this.request("/admin/issues");
  }

  static async createAdminIssue(issueData) {
    return await this.request("/admin/issues", "POST", issueData);
  }

  static async updateAdminIssue(id, issueData) {
    return await this.request(`/admin/issues/${id}`, "PUT", issueData);
  }

  static async deleteAdminIssue(id) {
    return await this.request(`/admin/issues/${id}`, "DELETE");
  }

  static async getAdminVersionHistory() {
    return await this.request("/admin/version-history");
  }

  static async createAdminVersionHistory(versionData) {
    return await this.request("/admin/version-history", "POST", versionData);
  }

  static async updateAdminVersionHistory(id, versionData) {
    return await this.request(
      `/admin/version-history/${id}`,
      "PUT",
      versionData
    );
  }

  static async deleteAdminVersionHistory(id) {
    return await this.request(`/admin/version-history/${id}`, "DELETE");
  }

  static async getAdminFeedback() {
    return await this.request("/admin/feedback");
  }

  static async sendFeedback(feedbackData) {
    return await this.request("/feedback", "POST", feedbackData);
  }
}
