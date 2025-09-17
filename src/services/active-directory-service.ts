
import apiClient from "./api-client";
import logger from "@/utils/logger";
import { AxiosError } from 'axios';

// Enhanced error type definitions to match backend structure
interface EnhancedLdapError {
  name?: string;
  message?: string;
  code?: string;
  errno?: number;
  syscall?: string;
  stack?: string;
}

interface ErrorContext {
  server?: string;
  port?: number;
  protocol?: string;
  baseDN?: string;
  operation?: string;
}

interface NetworkInfo {
  host?: string;
  port?: number;
  protocol?: string;
}

interface QuickDiagnosis {
  errorType?: string;
  likelyRootCause?: string;
  immediateAction?: string;
}

interface DetailedErrorInfo {
  timestamp?: string;
  context?: ErrorContext;
  error?: EnhancedLdapError;
  network?: NetworkInfo;
  troubleshooting?: string[];
}

interface EnhancedErrorResponse {
  summary?: string;
  details?: DetailedErrorInfo;
  quickDiagnosis?: QuickDiagnosis;
  connectionAttempt?: {
    server?: string;
    port?: number;
    protocol?: string;
    timeoutSettings?: {
      client?: number;
      connection?: number;
    };
  };
  nextSteps?: string[];
}

// Legacy error interfaces for backward compatibility
interface LdapError {
  code?: string;
  errno?: number;
  syscall?: string;
  message?: string;
  details?: string;
  server?: string;
}

interface SqlError {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
  message?: string;
  query?: string;
}

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

// API Error Response types
interface ADTestConnectionErrorResponse {
  ldapError?: LdapError;
  error?: string;
  // Enhanced error response fields
  enhancedError?: EnhancedErrorResponse;
  errorCode?: string;
  troubleshootingHints?: string[];
  timestamp?: string;
}

interface ADUserCreationErrorResponse {
  sqlError?: SqlError;
  ldapError?: LdapError;
  error?: string;
  // Enhanced error response fields
  enhancedError?: EnhancedErrorResponse;
  errorCode?: string;
  troubleshootingHints?: string[];
  timestamp?: string;
}

const AD_ENDPOINT = "/active-directory";

// The API client already includes /api in its baseURL
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
    } catch (error: unknown) {
      logger.api.error('AD connection test failed:', error);
      
      const axiosError = error as AxiosError<ADTestConnectionErrorResponse>;
      
      // Handle enhanced error response structure
      if (axiosError.response?.data) {
        const errorData = axiosError.response.data;
        
        // Log enhanced error details if available
        if (errorData.enhancedError) {
          logger.api.error('Enhanced LDAP error details:', {
            summary: errorData.enhancedError.summary,
            errorType: errorData.enhancedError.quickDiagnosis?.errorType,
            rootCause: errorData.enhancedError.quickDiagnosis?.likelyRootCause,
            immediateAction: errorData.enhancedError.quickDiagnosis?.immediateAction,
            troubleshooting: errorData.enhancedError.details?.troubleshooting,
            nextSteps: errorData.enhancedError.nextSteps
          });
        }
        
        // Use legacy LDAP error logging for backward compatibility
        if (errorData.ldapError) {
          logger.api.error('Legacy LDAP error:', errorData.ldapError);
        }
        
        // Log troubleshooting hints if available
        if (errorData.troubleshootingHints?.length) {
          logger.api.info('Troubleshooting hints:', errorData.troubleshootingHints);
        }
      }
      
      // Extract error message from response with enhanced context
      let errorMessage = "Connection test failed";
      
      if (axiosError.response?.data) {
        const errorData = axiosError.response.data;
        
        // Prioritize enhanced error summary
        if (errorData.enhancedError?.summary) {
          errorMessage = errorData.enhancedError.summary;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        // Add quick diagnosis if available
        if (errorData.enhancedError?.quickDiagnosis?.immediateAction) {
          errorMessage += ` - ${errorData.enhancedError.quickDiagnosis.immediateAction}`;
        }
      } else if (axiosError.message) {
        errorMessage = axiosError.message;
      }
      
      // Throw a clear error to be handled by the UI
      throw new Error(errorMessage);
    }
  },

  // Create AD user with enhanced error handling and meaningful error messages
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
      
      logger.api.info('AD user creation successful:', {
        hireId,
        username: userData.username,
        displayName: userData.displayName
      });
      
      return response.data;
    } catch (error: unknown) {
      logger.api.error('Failed to create AD user:', error);
      
      const axiosError = error as AxiosError<ADUserCreationErrorResponse>;
      
      // Log database errors with detail if available
      if (axiosError.response?.data?.sqlError) {
        logger.db.sqlError(axiosError.response.data.sqlError);
      }
      
      // Log LDAP errors with detail if available
      if (axiosError.response?.data?.ldapError) {
        logger.ldap.errorDetail(axiosError.response.data.ldapError);
      }
      
      // Enhanced error message handling for different AD constraint errors
      let userFriendlyMessage = "Failed to create Active Directory account";
      
      if (axiosError.response?.data?.error) {
        const errorMessage = axiosError.response.data.error.toLowerCase();
        
        // Handle specific AD constraint errors with meaningful messages
        if (errorMessage.includes('constraint_att_type') || errorMessage.includes('000021c8')) {
          if (errorMessage.includes('userprincipalname')) {
            userFriendlyMessage = "Username format is invalid or already exists in the domain. Please try a different username.";
          } else if (errorMessage.includes('samaccountname')) {
            userFriendlyMessage = "Username already exists or contains invalid characters. Please choose a different username.";
          } else {
            userFriendlyMessage = "User account information contains invalid data. Please check the username and email format.";
          }
        } else if (errorMessage.includes('already exists') || errorMessage.includes('object already exists')) {
          userFriendlyMessage = "A user with this username already exists in Active Directory. Please choose a different username.";
        } else if (errorMessage.includes('invalid credentials') || errorMessage.includes('authentication')) {
          userFriendlyMessage = "Unable to connect to Active Directory. Please check the AD service account credentials.";
        } else if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
          userFriendlyMessage = "Unable to connect to Active Directory server. Please check network connectivity and server settings.";
        } else if (errorMessage.includes('password') || errorMessage.includes('pwd')) {
          userFriendlyMessage = "Password does not meet Active Directory complexity requirements. Please ensure it contains uppercase, lowercase, numbers, and special characters.";
        } else if (errorMessage.includes('organizational unit') || errorMessage.includes('ou')) {
          userFriendlyMessage = "The specified organizational unit does not exist or is inaccessible. Please check the OU configuration.";
        } else if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
          userFriendlyMessage = "Insufficient permissions to create user accounts. Please check the AD service account permissions.";
        } else {
          // Use the original error message if it's already user-friendly
          userFriendlyMessage = axiosError.response.data.error;
        }
        
        throw new Error(userFriendlyMessage);
      }
      
      // Handle network and other errors
      if (axiosError.code === 'NETWORK_ERROR' || axiosError.code === 'ECONNREFUSED') {
        throw new Error("Unable to connect to the server. Please check your network connection and try again.");
      }
      
      if (axiosError.response?.status === 500) {
        throw new Error("Server error occurred while creating the AD account. Please contact your system administrator.");
      }
      
      if (axiosError.response?.status === 400) {
        throw new Error("Invalid user data provided. Please check all required fields and try again.");
      }
      
      // Fallback to generic error message
      throw new Error(userFriendlyMessage);
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
      
      logger.api.info('AD user search successful:', {
        query,
        userCount: response.data.users.length
      });
      
      return response.data;
    } catch (error: unknown) {
      logger.api.error('Failed to search AD users:', error);
      
      const axiosError = error as AxiosError<{ error?: string }>;
      
      if (axiosError.response?.data?.error) {
        return {
          success: false,
          users: [],
          error: axiosError.response.data.error
        };
      }
      
      return {
        success: false,
        users: [],
        error: 'Failed to search users'
      };
    }
  }
};
