
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
  authFormat: "upn" | "dn"; // Property to specify auth format
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

  // Test AD connection with improved error handling
  testConnection: async (settings: ActiveDirectorySettings): Promise<{ success: boolean; message: string }> => {
    logger.api.debug('Testing Active Directory connection');
    logger.api.debug(`Using auth format: ${settings.authFormat}, protocol: ${settings.protocol}`);
    logger.api.debug(`Username: ${settings.username}, Domain: ${settings.domain}`);
    
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `${AD_ENDPOINT}/test`,
        settings
      );
      return response.data;
    } catch (error: any) {
      logger.api.error('AD connection test failed:', error);
      
      // Extract error message from response if available and provide more context
      let errorMessage = "Connection test failed";
      
      // Check if we have a more specific error from the server
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Throw a clear error to be handled by the UI
      throw new Error(errorMessage);
    }
  },

  // Create AD user
  createUser: async (hireId: string, userData: ADUserData): Promise<ADUserCreationResult> => {
    logger.api.debug('Creating AD user for hire ID:', hireId);
    
    // Log password presence without revealing actual password
    logger.api.debug(`Password provided: ${userData.password ? 'Yes' : 'No'}, Length: ${userData.password?.length || 0}`);
    
    // Validate password before sending request
    if (!userData.password) {
      logger.api.error('Missing password for AD user creation');
      throw new Error("Missing password for user account creation");
    }
    
    // Check password length - typical AD minimum is 7 chars
    if (userData.password.length < 7) {
      logger.api.error('Password too short for AD user creation');
      throw new Error("Password must be at least 7 characters long");
    }
    
    try {
      // Validate required fields before sending to server
      if (!userData.username || !userData.displayName) {
        throw new Error("Missing required user parameters: username or displayName");
      }
      
      const response = await apiClient.post<ADUserCreationResult>(
        `${AD_ENDPOINT}/create-user/${hireId}`,
        userData
      );
      
      if (!response.data.success && response.data.error) {
        throw new Error(response.data.error);
      }
      
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to create AD user:', error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  }
};
