
import { AuthResponse, ImportResponse, LoginCredentials, NewHire } from "../types/types";
import { toast } from "../components/ui/use-toast";

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

// New Hires API
export const hiresApi = {
  getAll: async (): Promise<NewHire[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(newHires);
      }, 500);
    });
  },

  getOne: async (id: string): Promise<NewHire> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const hire = newHires.find((h) => h.id === id);
        if (hire) {
          resolve(hire);
        } else {
          reject(new Error("New hire not found"));
        }
      }, 300);
    });
  },

  create: async (hire: Omit<NewHire, "id">): Promise<NewHire> => {
    const newHire = {
      ...hire,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return new Promise((resolve) => {
      setTimeout(() => {
        newHires.push(newHire);
        resolve(newHire);
      }, 500);
    });
  },

  update: async (id: string, hire: Partial<NewHire>): Promise<NewHire> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = newHires.findIndex((h) => h.id === id);
        if (index !== -1) {
          newHires[index] = {
            ...newHires[index],
            ...hire,
            updated_at: new Date().toISOString(),
          };
          resolve(newHires[index]);
        } else {
          reject(new Error("New hire not found"));
        }
      }, 500);
    });
  },

  delete: async (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const initialLength = newHires.length;
        newHires = newHires.filter((h) => h.id !== id);
        
        if (newHires.length < initialLength) {
          resolve();
        } else {
          reject(new Error("New hire not found"));
        }
      }, 500);
    });
  },

  import: async (file: File): Promise<ImportResponse> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // In a real implementation, this would parse the file
        // and validate its contents against the schema
        
        // For this mock, we'll generate some sample data
        const sampleData: NewHire[] = Array(5).fill(null).map((_, index) => ({
          id: generateId(),
          name: `Employee ${index + 1}`,
          title: `Position ${index + 1}`,
          department: ["IT", "HR", "Finance", "Marketing", "Operations"][Math.floor(Math.random() * 5)],
          email: `employee${index + 1}@example.com`,
          direct_report: `Manager ${index % 3 + 1}`,
          phone_number: `555-${100 + index}`,
          mailing_list: "general,department",
          remarks: "",
          account_creation_status: Math.random() > 0.3 ? "Done" : "Pending",
          license_assigned: Math.random() > 0.5,
          status_srf: Math.random() > 0.5,
          username: `user${index + 1}`,
          password: "temporary",
          on_site_date: new Date(Date.now() + 86400000 * (index + 5)).toISOString().split("T")[0],
          microsoft_365_license: Math.random() > 0.3,
          laptop_ready: Math.random() > 0.3 ? "Ready" : "In Progress",
          note: "",
          ict_support_pic: `Support ${index % 3 + 1}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        
        // Add the sample data to our mock database
        newHires = [...newHires, ...sampleData];
        
        resolve({
          success: true,
          message: "Import successful",
          rowsImported: sampleData.length,
        });
      }, 1500);
    });
  },
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
      return JSON.parse(userStr);
    } catch (error) {
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
