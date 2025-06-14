import apiClient from './api-client';

export interface DistributionListSyncResult {
  success: boolean;
  message: string;
  results: Array<{
    distributionGroup: string;
    success: boolean;
    message: string;
    alreadyMember?: boolean;
  }>;
  errors: Array<{
    distributionGroup: string;
    error: string;
  }>;
  syncStatus: string;
}

export interface UserDistributionGroups {
  success: boolean;
  email: string;
  distributionGroups: Array<{
    Name: string;
    PrimarySmtpAddress: string;
    DisplayName?: string;
  }>;
}

export const distributionListService = {
  async syncUserToDistributionLists(hireId: string, mailingLists: string[]): Promise<DistributionListSyncResult> {
    const response = await apiClient.post('/distribution-lists/sync-user', {
      hireId,
      mailingLists
    });
    return response.data;
  },

  async removeUserFromDistributionLists(hireId: string, mailingLists: string[]): Promise<DistributionListSyncResult> {
    const response = await apiClient.post('/distribution-lists/remove-user', {
      hireId,
      mailingLists
    });
    return response.data;
  },

  async getUserDistributionGroups(email: string): Promise<UserDistributionGroups> {
    const response = await apiClient.get(`/distribution-lists/user/${encodeURIComponent(email)}`);
    return response.data;
  },

  async getAllDistributionGroups() {
    const response = await apiClient.get('/distribution-lists');
    return response.data;
  },

  async setupExchangeCredentials(username: string, password: string) {
    const response = await apiClient.post('/distribution-lists/setup-credentials', {
      username,
      password
    });
    return response.data;
  },

  async testBasicConnection(username: string) {
    const response = await apiClient.post('/distribution-lists/test-basic-connection', {
      username
    });
    return response.data;
  },

  // Keep the old method for backward compatibility but mark as deprecated
  async testConnection(appId: string, tenantId: string, certificateThumbprint: string) {
    console.warn('testConnection with certificate is deprecated. Use testBasicConnection instead.');
    const response = await apiClient.post('/distribution-lists/test-connection', {
      appId,
      tenantId,
      certificateThumbprint
    });
    return response.data;
  }
};
