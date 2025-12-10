import { httpClient } from './httpClient';
import { AuthResponse, SignupInput, LoginInput, User } from '../types/auth';

export const authApi = {
	signup(input: SignupInput): Promise<AuthResponse> {
		return httpClient.post<AuthResponse>('/auth/signup', input);
	},

	login(input: LoginInput): Promise<AuthResponse> {
		return httpClient.post<AuthResponse>('/auth/login', input);
	},

	getMe(): Promise<{ user: User }> {
		return httpClient.get<{ user: User }>('/auth/me');
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
			'/auth/profile',
			updates
		);
	},

	changePassword(
		currentPassword: string,
		newPassword: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>('/auth/change-password', {
			currentPassword,
			newPassword,
		});
	},

	forgotPassword(email: string): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>('/auth/forgot-password', {
			email,
		});
	},

	resetPassword(
		token: string,
		password: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>('/auth/reset-password', {
			token,
			password,
		});
	},
};
