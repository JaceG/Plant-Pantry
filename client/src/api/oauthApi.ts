import { httpClient } from "./httpClient";
import { AuthResponse } from "../types/auth";

export interface OAuthResponse extends AuthResponse {
  isNewUser: boolean;
}

export const oauthApi = {
  /**
   * Authenticate with Google
   * @param credential - The Google ID token from Google Sign-In
   */
  google(credential: string): Promise<OAuthResponse> {
    return httpClient.post<OAuthResponse>("/oauth/google", { credential });
  },

  /**
   * Authenticate with Apple
   * @param identityToken - The Apple identity token
   * @param user - Optional user info (name, email) from first-time Apple sign-in
   */
  apple(
    identityToken: string,
    user?: { name?: string; email?: string },
  ): Promise<OAuthResponse> {
    return httpClient.post<OAuthResponse>("/oauth/apple", {
      identityToken,
      user,
    });
  },
};
