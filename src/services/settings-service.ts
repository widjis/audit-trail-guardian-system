
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

interface WhatsAppSettings {
  apiUrl: string;
  defaultMessage: string;
  defaultRecipient: "userNumber" | "testNumber";
}

interface ActiveDirectorySettings {
  server: string;
  username: string;
  password: string;
  domain: string;
  baseDN: string;
  enabled: boolean;
  protocol: string;
  authFormat: string;
}

interface HrisDatabaseConfig {
  server: string;
  port: string;
  database: string;
  username: string;
  password: string;
  enabled: boolean;
}

interface SettingsData {
  accountStatuses?: string[];
  mailingLists?: MailingList[];
  departments?: Department[];
  mailingListDisplayAsDropdown?: boolean;
  whatsappSettings?: WhatsAppSettings;
  activeDirectorySettings?: ActiveDirectorySettings;
  hrisDbConfig?: HrisDatabaseConfig;
}

// The API client already includes /api in its baseURL, so we don't need to include it again
const SETTINGS_ENDPOINT = "/settings";

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
  },

  // Get WhatsApp settings
  getWhatsAppSettings: async () => {
    const response = await apiClient.get<WhatsAppSettings>(`${SETTINGS_ENDPOINT}/whatsapp`);
    return response.data;
  },

  // Update WhatsApp settings
  updateWhatsAppSettings: async (settings: WhatsAppSettings) => {
    const response = await apiClient.put<WhatsAppSettings>(
      `${SETTINGS_ENDPOINT}/whatsapp`,
      settings
    );
    return response.data;
  },

  // Get Active Directory settings
  getActiveDirectorySettings: async () => {
    const response = await apiClient.get<ActiveDirectorySettings>(`${SETTINGS_ENDPOINT}/active-directory`);
    return response.data;
  },

  // Update Active Directory settings
  updateActiveDirectorySettings: async (settings: ActiveDirectorySettings) => {
    const response = await apiClient.put<ActiveDirectorySettings>(
      `${SETTINGS_ENDPOINT}/active-directory`,
      settings
    );
    return response.data;
  },

  // Get HRIS database configuration
  getHrisDatabaseConfig: async () => {
    const response = await apiClient.get<HrisDatabaseConfig>(`${SETTINGS_ENDPOINT}/hris-database`);
    return response.data;
  },

  // Update HRIS database configuration
  updateHrisDatabaseConfig: async (config: HrisDatabaseConfig) => {
    const response = await apiClient.put<{ success: boolean }>(
      `${SETTINGS_ENDPOINT}/hris-database`,
      config
    );
    return response.data;
  },

  // Test HRIS database connection
  testHrisDatabaseConnection: async (config: HrisDatabaseConfig) => {
    const response = await apiClient.post<{ success: boolean; message?: string; error?: string }>(
      `${SETTINGS_ENDPOINT}/hris-database/test-connection`,
      config
    );
    return response.data;
  }
};
