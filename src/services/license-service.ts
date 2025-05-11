// src/services/license-service.ts
import apiClient from '@/services/api-client';

export interface LicenseType {
  id: string;
  name: string;
  description: string;
}

export const licenseService = {
  // Get all license types
  getLicenseTypes: async (): Promise<LicenseType[]> => {
    const response = await apiClient.get('/settings/license-types');
    return response.data;
  },
  
  // Add a new license type
  addLicenseType: async (licenseType: Omit<LicenseType, 'id'>): Promise<LicenseType> => {
    const response = await apiClient.post('/settings/license-types', licenseType);
    return response.data;
  },
  
  // Update a license type
  updateLicenseType: async (licenseType: LicenseType): Promise<LicenseType> => {
    const response = await apiClient.put(`/settings/license-types/${licenseType.id}`, licenseType);
    return response.data;
  },
  
  // Delete a license type
  deleteLicenseType: async (id: string): Promise<void> => {
    await apiClient.delete(`/settings/license-types/${id}`);
  }
};
