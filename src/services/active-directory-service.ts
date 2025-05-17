
import apiClient from "./api-client";

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
    const response = await apiClient.get<ActiveDirectorySettings>(AD_ENDPOINT);
    return response.data;
  },

  // Update AD settings
  updateSettings: async (settings: ActiveDirectorySettings): Promise<ActiveDirectorySettings> => {
    const response = await apiClient.put<ActiveDirectorySettings>(AD_ENDPOINT, settings);
    return response.data;
  },

  // Test AD connection
  testConnection: async (settings: ActiveDirectorySettings): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `${AD_ENDPOINT}/test`,
      settings
    );
    return response.data;
  },

  // Create AD user
  createUser: async (hireId: string, userData: ADUserData): Promise<ADUserCreationResult> => {
    const response = await apiClient.post<ADUserCreationResult>(
      `${AD_ENDPOINT}/create-user/${hireId}`,
      userData
    );
    return response.data;
  }
};
