
import apiClient from "./api-client";
import { UserAccount } from "@/types/types";

// The API client already includes /api in its baseURL, so we don't need to include it again
const USERS_ENDPOINT = "/users";

export const usersService = {
  // Get all support accounts
  getSupportAccounts: async (): Promise<UserAccount[]> => {
    const response = await apiClient.get<UserAccount[]>(`${USERS_ENDPOINT}/support`);
    return response.data;
  },

  // Create a new account
  createAccount: async (account: UserAccount): Promise<UserAccount> => {
    const response = await apiClient.post<UserAccount>(USERS_ENDPOINT, account);
    return response.data;
  },

  // Update an existing account
  updateAccount: async (account: UserAccount): Promise<UserAccount> => {
    const response = await apiClient.put<UserAccount>(`${USERS_ENDPOINT}/${account.id}`, account);
    return response.data;
  },

  // Delete an account
  deleteAccount: async (id: string): Promise<void> => {
    await apiClient.delete(`${USERS_ENDPOINT}/${id}`);
  },

  // Reset password
  resetPassword: async (id: string, password: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(
      `${USERS_ENDPOINT}/${id}/reset-password`,
      { password }
    );
    return response.data;
  }
};
