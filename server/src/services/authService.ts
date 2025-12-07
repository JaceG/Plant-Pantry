import { User, IUser, UserRole, AuthProvider } from '../models/User';
import { generateToken } from '../utils/jwt';

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

export interface AuthResult {
	user: {
		id: string;
		email: string;
		name?: string;
		displayName: string;
		role: UserRole;
		profilePicture?: string;
		authProvider: AuthProvider;
		// Location preferences
		preferredCity?: string;
		preferredState?: string;
		latitude?: number;
		longitude?: number;
	};
	token: string;
}

export interface AuthError {
	message: string;
	field?: string;
}

class AuthServiceError extends Error {
	field?: string;
	statusCode: number;

	constructor(message: string, statusCode: number = 400, field?: string) {
		super(message);
		this.name = 'AuthServiceError';
		this.statusCode = statusCode;
		this.field = field;
	}
}

export const authService = {
	/**
	 * Register a new user
	 */
	async signup(input: SignupInput): Promise<AuthResult> {
		const { email, password, name, displayName } = input;

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			throw new AuthServiceError('Invalid email format', 400, 'email');
		}

		// Validate password length
		if (password.length < 8) {
			throw new AuthServiceError(
				'Password must be at least 8 characters',
				400,
				'password'
			);
		}

		// Validate password contains at least one letter
		if (!/[a-zA-Z]/.test(password)) {
			throw new AuthServiceError(
				'Password must contain at least one letter',
				400,
				'password'
			);
		}

		// Validate password contains at least one number
		if (!/[0-9]/.test(password)) {
			throw new AuthServiceError(
				'Password must contain at least one number',
				400,
				'password'
			);
		}

		// Validate display name
		if (!displayName || displayName.trim().length < 2) {
			throw new AuthServiceError(
				'Display name must be at least 2 characters',
				400,
				'displayName'
			);
		}

		// Check if user already exists
		const existingUser = await User.findOne({ email: email.toLowerCase() });
		if (existingUser) {
			throw new AuthServiceError(
				'Email already registered',
				409,
				'email'
			);
		}

		// Create user
		const user = await User.create({
			email: email.toLowerCase(),
			password,
			name: name?.trim() || undefined,
			displayName: displayName.trim(),
			role: 'user',
			authProvider: 'local',
		});

		// Generate token
		const token = generateToken(user);

		return {
			user: {
				id: user._id.toString(),
				email: user.email,
				name: user.name,
				displayName: user.displayName,
				role: user.role,
				profilePicture: user.profilePicture,
				authProvider: user.authProvider,
				preferredCity: user.preferredCity,
				preferredState: user.preferredState,
				latitude: user.latitude,
				longitude: user.longitude,
			},
			token,
		};
	},

	/**
	 * Login an existing user
	 */
	async login(input: LoginInput): Promise<AuthResult> {
		const { email, password } = input;

		// Find user by email
		const user = await User.findOne({ email: email.toLowerCase() });
		if (!user) {
			throw new AuthServiceError('Invalid email or password', 401);
		}

		// Verify password
		const isPasswordValid = await user.comparePassword(password);
		if (!isPasswordValid) {
			throw new AuthServiceError('Invalid email or password', 401);
		}

		// Update last login
		user.lastLogin = new Date();
		await user.save();

		// Generate token
		const token = generateToken(user);

		return {
			user: {
				id: user._id.toString(),
				email: user.email,
				name: user.name,
				displayName: user.displayName,
				role: user.role,
				profilePicture: user.profilePicture,
				authProvider: user.authProvider,
				preferredCity: user.preferredCity,
				preferredState: user.preferredState,
				latitude: user.latitude,
				longitude: user.longitude,
			},
			token,
		};
	},

	/**
	 * Get user by ID (for /me endpoint)
	 */
	async getUserById(userId: string): Promise<AuthResult['user'] | null> {
		const user = await User.findById(userId).select('-password');
		if (!user) {
			return null;
		}

		return {
			id: user._id.toString(),
			email: user.email,
			name: user.name,
			displayName: user.displayName,
			role: user.role,
			profilePicture: user.profilePicture,
			authProvider: user.authProvider,
			preferredCity: user.preferredCity,
			preferredState: user.preferredState,
			latitude: user.latitude,
			longitude: user.longitude,
		};
	},

	/**
	 * Update user profile
	 */
	async updateProfile(
		userId: string,
		updates: {
			name?: string;
			displayName?: string;
			email?: string;
			preferredCity?: string;
			preferredState?: string;
			latitude?: number;
			longitude?: number;
		}
	): Promise<AuthResult['user'] | null> {
		const updateData: Record<string, string | number | undefined> = {};

		// Handle name update (can be set to empty string to clear it)
		if (updates.name !== undefined) {
			updateData.name = updates.name.trim() || undefined;
		}

		if (updates.displayName && updates.displayName.trim().length >= 2) {
			updateData.displayName = updates.displayName.trim();
		}

		if (updates.email) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(updates.email)) {
				throw new AuthServiceError(
					'Invalid email format',
					400,
					'email'
				);
			}

			// Check if email is already taken by another user
			const existingUser = await User.findOne({
				email: updates.email.toLowerCase(),
				_id: { $ne: userId },
			});
			if (existingUser) {
				throw new AuthServiceError(
					'Email already in use',
					409,
					'email'
				);
			}

			updateData.email = updates.email.toLowerCase();
		}

		// Handle location updates
		if (updates.preferredCity !== undefined) {
			updateData.preferredCity =
				updates.preferredCity.trim() || undefined;
		}
		if (updates.preferredState !== undefined) {
			updateData.preferredState =
				updates.preferredState.trim() || undefined;
		}
		if (updates.latitude !== undefined) {
			updateData.latitude = updates.latitude;
		}
		if (updates.longitude !== undefined) {
			updateData.longitude = updates.longitude;
		}

		const user = await User.findByIdAndUpdate(
			userId,
			{ $set: updateData },
			{ new: true }
		).select('-password');

		if (!user) {
			return null;
		}

		return {
			id: user._id.toString(),
			email: user.email,
			name: user.name,
			displayName: user.displayName,
			role: user.role,
			profilePicture: user.profilePicture,
			authProvider: user.authProvider,
			preferredCity: user.preferredCity,
			preferredState: user.preferredState,
			latitude: user.latitude,
			longitude: user.longitude,
		};
	},

	/**
	 * Change user password
	 */
	async changePassword(
		userId: string,
		currentPassword: string,
		newPassword: string
	): Promise<boolean> {
		const user = await User.findById(userId);
		if (!user) {
			throw new AuthServiceError('User not found', 404);
		}

		// Verify current password
		const isPasswordValid = await user.comparePassword(currentPassword);
		if (!isPasswordValid) {
			throw new AuthServiceError(
				'Current password is incorrect',
				401,
				'currentPassword'
			);
		}

		// Validate new password
		if (newPassword.length < 8) {
			throw new AuthServiceError(
				'New password must be at least 8 characters',
				400,
				'newPassword'
			);
		}

		// Update password
		user.password = newPassword;
		await user.save();

		return true;
	},
};

export { AuthServiceError };
