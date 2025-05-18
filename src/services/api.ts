import { AuthResponse, ImportResponse, LoginCredentials, NewHire, AuditLog } from "../types/types";
import { toast } from "../components/ui/use-toast";
import apiClient from './api-client';

// Mock database
let newHires: NewHire[] = [];
let users = [
  {
    id: "1",
    username: "admin",
    // This would be hashed in a real application
    password: "password123",
    role: "admin",
  },
];
let auditLogs: AuditLog[] = [];

// Helper to generate UUID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Simulate JWT token
const generateToken = (userId: string, username: string, role: string) => {
  return btoa(JSON.stringify({ userId, username, role, exp: Date.now() + 3600000 }));
};

// Authentication API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const user = users.find(
      (u) => u.username === credentials.username && u.password === credentials.password
    );

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (user) {
          const token = generateToken(user.id, user.username, user.role);
          resolve({
            token,
            user: {
              id: user.id,
              username: user.username,
              role: user.role,
            },
          });
        } else {
          reject(new Error("Invalid credentials"));
        }
      }, 500);
    });
  },

  register: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const existingUser = users.find((u) => u.username === credentials.username);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (existingUser) {
          reject(new Error("Username already exists"));
        } else {
          const newUser = {
            id: generateId(),
            username: credentials.username,
            password: credentials.password,
            role: "user",
          };
          
          users.push(newUser);
          
          const token = generateToken(newUser.id, newUser.username, newUser.role);
          resolve({
            token,
            user: {
              id: newUser.id,
              username: newUser.username,
              role: newUser.role,
            },
          });
        }
      }, 500);
    });
  },

  verifyToken: (): boolean => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    
    try {
      const decoded = JSON.parse(atob(token));
      return decoded.exp > Date.now();
    } catch (error) {
      return false;
    }
  },
};

// Audit Logs API
export const auditApi = {
  // Create a new audit log entry
  createLog: async (auditLog: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog> => {
    const newLog = {
      ...auditLog,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve) => {
      setTimeout(() => {
        auditLogs.push(newLog);
        
        // Associate the log with the new hire
        const hireIndex = newHires.findIndex(h => h.id === auditLog.new_hire_id);
        if (hireIndex !== -1) {
          if (!newHires[hireIndex].audit_logs) {
            newHires[hireIndex].audit_logs = [];
          }
          newHires[hireIndex].audit_logs!.push(newLog);
        }
        
        resolve(newLog);
      }, 300);
    });
  },

  // Get all logs for a specific new hire
  getLogsForHire: async (hireId: string): Promise<AuditLog[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const logs = auditLogs.filter(log => log.new_hire_id === hireId);
        resolve(logs);
      }, 300);
    });
  },

  // Get all logs
  getAllLogs: async (): Promise<AuditLog[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(auditLogs);
      }, 300);
    });
  }
};

// New Hires API
export const hiresApi = {
  getAll: async (): Promise<NewHire[]> => {
    console.log('[hiresApi] Getting all hires');
    try {
      const response = await apiClient.get('/hires');
      console.log('[hiresApi] Got all hires response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[hiresApi] Error getting all hires:', error);
      throw error;
    }
  },

  getOne: async (id: string): Promise<NewHire> => {
    console.log('[hiresApi] Getting hire with ID:', id);
    try {
      const response = await apiClient.get(`/hires/${id}`);
      console.log('[hiresApi] Got hire with ID:', id, 'Response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`[hiresApi] Error getting hire with ID ${id}:`, error);
      throw error;
    }
  },

  create: async (hire: Omit<NewHire, "id">): Promise<NewHire> => {
    console.log('[hiresApi] Creating new hire:', JSON.stringify(hire));
    try {
      const response = await apiClient.post('/hires', hire);
      console.log('[hiresApi] Create hire response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[hiresApi] Error creating hire:', error);
      throw error;
    }
  },

  update: async (id: string, hire: Partial<NewHire>): Promise<NewHire> => {
    console.log('[hiresApi] Updating hire with ID:', id, 'Data:', JSON.stringify(hire));
    try {
      // Create a clean copy of the hire data, removing audit_logs to prevent payload size issues
      const hireToUpdate = { ...hire };
      delete hireToUpdate.audit_logs;
      
      const response = await apiClient.put(`/hires/${id}`, hireToUpdate);
      console.log('[hiresApi] Update hire response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`[hiresApi] Error updating hire with ID ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    console.log('[hiresApi] Deleting hire with ID:', id);
    try {
      await apiClient.delete(`/hires/${id}`);
      console.log('[hiresApi] Hire deleted successfully');
    } catch (error) {
      console.error(`[hiresApi] Error deleting hire with ID ${id}:`, error);
      throw error;
    }
  },

  import: async (file: File): Promise<ImportResponse> => {
    console.log('[hiresApi] Importing hires from file');
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('/hires/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('[hiresApi] Import response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[hiresApi] Error importing hires:', error);
      throw error;
    }
  },
  
  downloadTemplate: async (): Promise<void> => {
    console.log('[hiresApi] Downloading CSV template');
    try {
      const response = await apiClient.get('/hires/template', {
        responseType: 'blob',
      });
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'new_hire_template.csv');
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('[hiresApi] CSV template downloaded successfully');
    } catch (error) {
      console.error('[hiresApi] Error downloading CSV template:', error);
      throw error;
    }
  },
  
  bulkDelete: async (ids: string[]): Promise<void> => {
    console.log('[hiresApi] Bulk deleting hires with IDs:', ids);
    try {
      await apiClient.post('/hires/bulk-delete', { ids });
      console.log('[hiresApi] Hires bulk deleted successfully');
    } catch (error) {
      console.error('[hiresApi] Error bulk deleting hires:', error);
      throw error;
    }
  },
  
  bulkUpdate: async (ids: string[], updateData: Partial<NewHire>): Promise<void> => {
    console.log('[hiresApi] Bulk updating hires with IDs:', ids, 'Data:', updateData);
    try {
      // Remove audit_logs from the update data to prevent payload size issues
      const cleanUpdateData = { ...updateData };
      delete cleanUpdateData.audit_logs;
      
      await apiClient.post('/hires/bulk-update', { ids, updateData: cleanUpdateData });
      console.log('[hiresApi] Hires bulk updated successfully');
    } catch (error) {
      console.error('[hiresApi] Error bulk updating hires:', error);
      throw error;
    }
  }
};

// Auth helper hook
export const useAuth = () => {
  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authApi.login(credentials);
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      return response;
    } catch (error) {
      console.error("Login failed:", error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (credentials: LoginCredentials) => {
    try {
      const response = await authApi.register(credentials);
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      return response;
    } catch (error) {
      console.error("Registration failed:", error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const isAuthenticated = () => {
    return authApi.verifyToken();
  };

  const getCurrentUser = () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    
    try {
      const user = JSON.parse(userStr);
      console.log("Current user from localStorage:", user);
      return user;
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
      return null;
    }
  };

  return {
    login,
    register,
    logout,
    isAuthenticated,
    getCurrentUser,
  };
};
