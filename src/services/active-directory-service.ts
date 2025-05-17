
import apiClient from "./api-client";
import logger from "@/utils/logger";

interface ActiveDirectorySettings {
  server: string;
  username: string;
  password: string;
  domain: string;
  baseDN: string;
  enabled: boolean;
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
      throw error;
    }
  },

  // Create AD user
  createUser: async (hireId: string, userData: ADUserData): Promise<ADUserCreationResult> => {
    logger.api.debug('Creating AD user for hire ID:', hireId);
    try {
      const response = await apiClient.post<ADUserCreationResult>(
        `${AD_ENDPOINT}/create-user/${hireId}`,
        userData
      );
      return response.data;
    } catch (error) {
      logger.api.error('Failed to create AD user:', error);
      throw error;
    }
  }
};
