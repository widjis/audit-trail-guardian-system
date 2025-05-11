
import apiClient from './api-client';
import { MS365LicenseType } from '@/types/types';

export const licenseService = {
  getLicenseTypes: async (): Promise<MS365LicenseType[]> => {
    console.log('[licenseService] Fetching MS365 license types');
    try {
      const response = await apiClient.get('/hires/license-types');
      console.log('[licenseService] Got license types response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[licenseService] Error getting license types:', error);
      throw error;
    }
  }
};
