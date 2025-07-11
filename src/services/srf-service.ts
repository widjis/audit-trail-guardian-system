
import apiClient from './api-client';
import { SrfUploadResponse } from '@/types/types';

export const srfService = {
  // Upload SRF document
  uploadSrfDocument: async (hireId: string, file: File): Promise<SrfUploadResponse> => {
    const formData = new FormData();
    formData.append('srf-document', file);

    const response = await apiClient.post(`/hires/${hireId}/srf-upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Preview SRF document (for inline viewing)
  previewSrfDocument: async (hireId: string): Promise<string> => {
    const response = await apiClient.get(`/hires/${hireId}/srf-preview`, {
      responseType: 'blob',
    });

    // Create a blob URL for the PDF preview
    const blob = new Blob([response.data], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  },

  // Download SRF document
  downloadSrfDocument: async (hireId: string, filename: string): Promise<Blob> => {
    const response = await apiClient.get(`/hires/${hireId}/srf-download`, {
      responseType: 'blob',
    });

    return response.data;
  },

  // Delete SRF document
  deleteSrfDocument: async (hireId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/hires/${hireId}/srf-document`);
    return response.data;
  },
};
