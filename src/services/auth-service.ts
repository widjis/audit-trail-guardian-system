
import apiClient from './api-client';
import { AuthResponse, LoginCredentials } from "../types/types";
import { toast } from "../components/ui/use-toast";

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', credentials);
    return response.data;
  },

  verifyToken: async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;
      
      const response = await apiClient.post('/auth/verify-token', { token });
      return response.data.valid;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  },
};

// Auth hook for convenient usage
export const useAuth = () => {
  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authService.login(credentials);
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
      const response = await authService.register(credentials);
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

  const isAuthenticated = async () => {
    return await authService.verifyToken();
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
