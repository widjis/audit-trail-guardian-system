
import apiClient from "./api-client";

// Settings types
interface MailingList {
  id: string;
  name: string;
  isDefault: boolean;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface SettingsData {
  accountStatuses?: string[];
  mailingLists?: MailingList[];
  departments?: Department[];
  mailingListDisplayAsDropdown?: boolean;
}

const SETTINGS_ENDPOINT = "/api/settings";

export const settingsService = {
  // Get all settings
  getSettings: async () => {
    const response = await apiClient.get<SettingsData>(SETTINGS_ENDPOINT);
    return response.data;
  },

  // Update account statuses
  updateAccountStatuses: async (statuses: string[]) => {
    const response = await apiClient.put<{ success: boolean }>(
      `${SETTINGS_ENDPOINT}/account-statuses`, 
      { statuses }
    );
    return response.data;
  },

  // Update mailing lists
  updateMailingLists: async (mailingLists: MailingList[], displayAsDropdown: boolean) => {
    const response = await apiClient.put<{ success: boolean }>(
      `${SETTINGS_ENDPOINT}/mailing-lists`, 
      { mailingLists, displayAsDropdown }
    );
    return response.data;
  },

  // Update departments
  updateDepartments: async (departments: Department[]) => {
    const response = await apiClient.put<{ success: boolean }>(
      `${SETTINGS_ENDPOINT}/departments`, 
      { departments }
    );
    return response.data;
  }
};
