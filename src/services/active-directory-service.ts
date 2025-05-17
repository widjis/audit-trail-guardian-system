
import apiClient from "./api-client";
import logger from "@/utils/logger";

interface ActiveDirectorySettings {
  server: string;
  username: string;
  password: string;
  domain: string;
  baseDN: string;
  protocol: "ldap" | "ldaps";
  enabled: boolean;
  authFormat: "upn" | "dn"; // New property to specify auth format
}

interface ADUserData {
  username: string;
  displayName: string;
  firstName: string;
  lastName: string;
  password: string;
  email: string;
  title: string;
  department: string;
  ou: string;
  acl: string;
  company: string;
  office: string;
}

interface ADUserCreationResult {
  success: boolean;
  message: string;
  details?: {
    samAccountName: string;
    displayName: string;
    distinguishedName: string;
    groups: string[];
  };
  warning?: string;
  error?: string;
}

// The API client already includes /api in its baseURL
const AD_ENDPOINT = "/settings/active-directory";

export const activeDirectoryService = {
  // Get AD settings
  getSettings: async (): Promise<ActiveDirectorySettings> => {
    logger.api.debug('Fetching Active Directory settings');
    try {
      const response = await apiClient.get<ActiveDirectorySettings>(AD_ENDPOINT);
      return response.data;
    } catch (error) {
      logger.api.error('Failed to fetch AD settings:', error);
      throw error;
    }
  },

  // Update AD settings
  updateSettings: async (settings: ActiveDirectorySettings): Promise<ActiveDirectorySettings> => {
    logger.api.debug('Updating Active Directory settings');
    try {
      const response = await apiClient.put<ActiveDirectorySettings>(AD_ENDPOINT, settings);
      return response.data;
    } catch (error) {
      logger.api.error('Failed to update AD settings:', error);
      throw error;
    }
  },

  // Test AD connection
  testConnection: async (settings: ActiveDirectorySettings): Promise<{ success: boolean; message: string }> => {
    logger.api.debug('Testing Active Directory connection');
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `${AD_ENDPOINT}/test`,
        settings
      );
      return response.data;
    } catch (error) {
      logger.api.error('AD connection test failed:', error);
      // Extract error message from response if available
      const errorMessage = error.response?.data?.error || "Connection test failed";
      throw new Error(errorMessage);
    }
  },

  // Create AD user
  createUser: async (hireId: string, userData: ADUserData): Promise<ADUserCreationResult> => {
    logger.api.debug('Creating AD user for hire ID:', hireId);
    try {
      // Validate required fields before sending to server
      if (!userData.username || !userData.displayName || !userData.password) {
        throw new Error("Missing required user parameters: username, displayName, or password");
      }
      
      const response = await apiClient.post<ADUserCreationResult>(
        `${AD_ENDPOINT}/create-user/${hireId}`,
        userData
      );
      
      if (!response.data.success && response.data.error) {
        throw new Error(response.data.error);
      }
      
      return response.data;
    } catch (error) {
      logger.api.error('Failed to create AD user:', error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  }
};
