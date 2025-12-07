export type UserRole = 'user' | 'admin' | 'moderator';
export type AuthProvider = 'local' | 'google' | 'apple';

export interface User {
	id: string;
	email: string;
	name?: string; // Real name (optional)
	displayName: string;
	role: UserRole;
	profilePicture?: string;
	authProvider: AuthProvider;
	// Location preferences
	preferredCity?: string;
	preferredState?: string;
	latitude?: number;
	longitude?: number;
}

export interface AuthResponse {
	message: string;
	user: User;
	token: string;
}

export interface SignupInput {
	email: string;
	password: string;
	name?: string; // Real name (optional)
	displayName: string;
}

export interface LoginInput {
	email: string;
	password: string;
}

export interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	isAdmin: boolean;
}
