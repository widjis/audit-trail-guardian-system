import apiClient from './api-client';
import { UserPreference, UserPreferencesRequest, UserPreferencesResponse } from '../types/types';

/**
 * Service for managing user preferences
 */
export const userPreferencesService = {
  /**
   * Get all preferences for the current user
   */
  getPreferences: async (): Promise<Record<string, any>> => {
    const response = await apiClient.get('/user-preferences');
    return response.data.preferences;
  },

  /**
   * Save multiple preferences for the current user
   */
  savePreferences: async (preferences: Record<string, any>): Promise<UserPreferencesResponse> => {
    const response = await apiClient.post('/user-preferences', { preferences });
    return response.data;
  },

  /**
   * Delete a specific preference by key
   */
  deletePreference: async (key: string): Promise<{ success: boolean; deleted: boolean }> => {
    const response = await apiClient.delete(`/user-preferences/${key}`);
    return response.data;
  },

  /**
   * Clear all preferences for the current user
   */
  clearAllPreferences: async (): Promise<{ success: boolean; deleted: number }> => {
    const response = await apiClient.delete('/user-preferences');
    return response.data;
  }
};

/**
 * React hook for managing user preferences
 */
export const useUserPreferences = () => {
  const getPreference = async (key: string, defaultValue: any = null) => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found, using default value for preference:', key);
        return defaultValue;
      }
      
      const preferences = await userPreferencesService.getPreferences();
      return preferences[key] !== undefined ? preferences[key] : defaultValue;
    } catch (error) {
      console.error('Error getting preference:', error);
      // If it's an auth error, return default value silently
      if (error.response?.status === 401) {
        console.warn('Authentication required for preferences, using default value');
      }
      return defaultValue;
    }
  };

  const savePreference = async (key: string, value: any) => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found, cannot save preference:', key);
        return; // Silently fail if not authenticated
      }
      
      await userPreferencesService.savePreferences({ [key]: value });
    } catch (error) {
      console.error('Error saving preference:', error);
      // If it's an auth error, fail silently
      if (error.response?.status === 401) {
        console.warn('Authentication required for saving preferences');
        return;
      }
      throw error;
    }
  };

  const saveMultiplePreferences = async (preferences: Record<string, any>) => {
    try {
      await userPreferencesService.savePreferences(preferences);
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw error;
    }
  };

  const deletePreference = async (key: string) => {
    try {
      await userPreferencesService.deletePreference(key);
    } catch (error) {
      console.error('Error deleting preference:', error);
      throw error;
    }
  };

  const clearAllPreferences = async () => {
    try {
      await userPreferencesService.clearAllPreferences();
    } catch (error) {
      console.error('Error clearing preferences:', error);
      throw error;
    }
  };

  return {
    getPreference,
    savePreference,
    saveMultiplePreferences,
    deletePreference,
    clearAllPreferences
  };
};

export default userPreferencesService;