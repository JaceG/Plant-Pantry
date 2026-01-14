import { httpClient } from "./httpClient";
import { AuthResponse, SignupInput, LoginInput, User } from "../types/auth";

export interface LinkedAccounts {
  hasPassword: boolean;
  hasGoogle: boolean;
  hasApple: boolean;
}

export const authApi = {
  signup(input: SignupInput): Promise<AuthResponse> {
    return httpClient.post<AuthResponse>("/auth/signup", input);
  },

  login(input: LoginInput): Promise<AuthResponse> {
    return httpClient.post<AuthResponse>("/auth/login", input);
  },

  getMe(): Promise<{ user: User }> {
    return httpClient.get<{ user: User }>("/auth/me");
  },

  updateProfile(updates: {
    name?: string;
    displayName?: string;
    email?: string;
    preferredCity?: string;
    preferredState?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<{ message: string; user: User }> {
    return httpClient.put<{ message: string; user: User }>(
      "/auth/profile",
      updates,
    );
  },

  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    return httpClient.post<{ message: string }>("/auth/change-password", {
      currentPassword,
      newPassword,
    });
  },

  forgotPassword(email: string): Promise<{ message: string }> {
    return httpClient.post<{ message: string }>("/auth/forgot-password", {
      email,
    });
  },

  resetPassword(token: string, password: string): Promise<{ message: string }> {
    return httpClient.post<{ message: string }>("/auth/reset-password", {
      token,
      password,
    });
  },

  // Linked accounts management
  getLinkedAccounts(): Promise<LinkedAccounts> {
    return httpClient.get<LinkedAccounts>("/auth/linked-accounts");
  },

  setPassword(password: string): Promise<{ message: string }> {
    return httpClient.post<{ message: string }>("/auth/set-password", {
      password,
    });
  },

  removePassword(): Promise<{ message: string }> {
    return httpClient.delete<{ message: string }>("/auth/remove-password");
  },

  linkGoogle(credential: string): Promise<{ message: string }> {
    return httpClient.post<{ message: string }>("/auth/link/google", {
      credential,
    });
  },

  linkApple(
    identityToken: string,
    user?: { name?: string; email?: string },
  ): Promise<{ message: string }> {
    return httpClient.post<{ message: string }>("/auth/link/apple", {
      identityToken,
      user,
    });
  },

  unlinkProvider(provider: "google" | "apple"): Promise<{ message: string }> {
    return httpClient.delete<{ message: string }>(`/auth/unlink/${provider}`);
  },
};
