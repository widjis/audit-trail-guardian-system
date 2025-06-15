
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

interface ADUser {
  displayName: string;
  username: string;
  email: string;
  title: string;
  department: string;
  dn: string;
}

interface ADUserSearchResult {
  success: boolean;
  users: ADUser[];
  error?: string;
}

// The API client already includes /api in its baseURL
const AD_ENDPOINT = "/active-directory";

// Add in-memory cache for sensitive information that shouldn't be in localStorage
const memoryCache = {
  actualPassword: "" // Store the actual password in memory (not persisted)
};

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
      // If this is an actual password (not masked), save it to memory cache
      if (settings.password && settings.password !== '••••••••') {
        memoryCache.actualPassword = settings.password;
      }
      
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
      // If password is masked and we have the actual password in memory, use it
      const testSettings = { ...settings };
      if (testSettings.password === '••••••••' && memoryCache.actualPassword) {
        testSettings.password = memoryCache.actualPassword;
      }
      
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `${AD_ENDPOINT}/test`,
        testSettings
      );
      logger.api.info('Active Directory connection test successful:', response.data.message);
      return response.data;
    } catch (error: any) {
      logger.api.error('AD connection test failed:', error);
      
      // Use the enhanced LDAP error logging if available
      if (error.response?.data?.ldapError) {
        logger.ldap.errorDetail(error.response.data.ldapError);
      }
      
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

  // Create AD user with additional error handling and logging
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
        logger.api.error('Missing required fields for AD user creation');
        throw new Error("Missing required user parameters: username or displayName");
      }
      
      logger.ldap.operation('createUser', {
        username: userData.username,
        displayName: userData.displayName,
        ou: userData.ou,
        hireId: hireId
      });
      
      const response = await apiClient.post<ADUserCreationResult>(
        `${AD_ENDPOINT}/create-user/${hireId}`,
        userData
      );
      
      if (!response.data.success && response.data.error) {
        logger.api.error('AD user creation failed with error:', response.data.error);
        throw new Error(response.data.error);
      }
      
      if (response.data.warning) {
        logger.api.warn('AD user created with warning:', response.data.warning);
      }
      
      logger.api.info('AD user created successfully:', {
        username: userData.username,
        displayName: userData.displayName
      });
      
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to create AD user:', error);
      
      // Log database errors with detail if available
      if (error.response?.data?.sqlError) {
        logger.db.sqlError(error.response.data.sqlError);
      }
      
      // Log LDAP errors with detail if available
      if (error.response?.data?.ldapError) {
        logger.ldap.errorDetail(error.response.data.ldapError);
      }
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  },

  // Search for users in Active Directory with improved error handling and data validation
  searchUsers: async (query: string): Promise<ADUserSearchResult> => {
    if (!query || query.length < 2) {
      logger.api.debug('Search query too short (need at least 2 characters)');
      return { success: false, users: [], error: "Search query must be at least 2 characters" };
    }
    
    logger.api.debug('Searching AD for users matching:', query);
    
    try {
      const response = await apiClient.get<ADUserSearchResult>(
        `${AD_ENDPOINT}/search-users?query=${encodeURIComponent(query)}`
      );
      
      // Initialize users array to ensure it's always an array, even if the response is invalid
      let users: ADUser[] = [];
      
      // Validate response format and structure with comprehensive null checks
      if (response?.data) {
        if (Array.isArray(response.data.users)) {
          // Make sure each user object has the required properties
          users = response.data.users.map(user => ({
            displayName: user?.displayName || '',
            username: user?.username || '',
            email: user?.email || '',
            title: user?.title || '',
            department: user?.department || '',
            dn: user?.dn || ''
          }));
        } else {
          logger.api.warn(`Invalid users data format received from server for query: ${query}`);
        }
      } else {
        logger.api.warn(`Invalid response format from server for query: ${query}`);
      }
        
      logger.api.info(`Found ${users.length} AD users matching "${query}"`);
      
      return {
        success: true,
        users: users
      };
    } catch (error: any) {
      logger.api.error('Failed to search AD users:', error);
      
      // Check for specific error messages from the server
      if (error.response?.data?.error) {
        return { 
          success: false, 
          users: [], 
          error: error.response.data.error 
        };
      }
      
      return { 
        success: false, 
        users: [], 
        error: error.message || 'Failed to search Active Directory users' 
      };
    }
  }
};
