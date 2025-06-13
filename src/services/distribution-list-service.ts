
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

  async testConnection(appId: string, tenantId: string, certificateThumbprint: string) {
    const response = await apiClient.post('/distribution-lists/test-connection', {
      appId,
      tenantId,
      certificateThumbprint
    });
    return response.data;
  }
};
