import { Router, Request, Response, NextFunction } from 'express';
import { authService, AuthServiceError } from '../services/authService';
import { oauthService, OAuthServiceError } from '../services/oauthService';
import { authMiddleware } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post(
	'/signup',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { email, password, name, displayName } = req.body;

			if (!email || !password || !displayName) {
				throw new HttpError(
					'Email, password, and display name are required',
					400
				);
			}

			const result = await authService.signup({
				email,
				password,
				name,
				displayName,
			});

			res.status(201).json({
				message: 'Account created successfully',
				user: result.user,
				token: result.token,
			});
		} catch (error) {
			if (error instanceof AuthServiceError) {
				next(new HttpError(error.message, error.statusCode));
			} else {
				next(error);
			}
		}
	}
);

/**
 * POST /api/auth/login
 * Login an existing user
 */
router.post(
	'/login',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { email, password } = req.body;

			if (!email || !password) {
				throw new HttpError('Email and password are required', 400);
			}

			const result = await authService.login({ email, password });

			res.json({
				message: 'Login successful',
				user: result.user,
				token: result.token,
			});
		} catch (error) {
			if (error instanceof AuthServiceError) {
				next(new HttpError(error.message, error.statusCode));
			} else {
				next(error);
			}
		}
	}
);

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get(
	'/me',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = req.userId;
			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			const user = await authService.getUserById(userId);
			if (!user) {
				throw new HttpError('User not found', 404);
			}

			res.json({ user });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * PUT /api/auth/profile
 * Update user profile (requires authentication)
 */
router.put(
	'/profile',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = req.userId;
			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			const {
				name,
				displayName,
				email,
				preferredCity,
				preferredState,
				latitude,
				longitude,
			} = req.body;
			const user = await authService.updateProfile(userId, {
				name,
				displayName,
				email,
				preferredCity,
				preferredState,
				latitude,
				longitude,
			});

			if (!user) {
				throw new HttpError('User not found', 404);
			}

			res.json({
				message: 'Profile updated successfully',
				user,
			});
		} catch (error) {
			if (error instanceof AuthServiceError) {
				next(new HttpError(error.message, error.statusCode));
			} else {
				next(error);
			}
		}
	}
);

/**
 * POST /api/auth/change-password
 * Change user password (requires authentication)
 */
router.post(
	'/change-password',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = req.userId;
			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			const { currentPassword, newPassword } = req.body;

			if (!currentPassword || !newPassword) {
				throw new HttpError(
					'Current password and new password are required',
					400
				);
			}

			await authService.changePassword(
				userId,
				currentPassword,
				newPassword
			);

			res.json({
				message: 'Password changed successfully',
			});
		} catch (error) {
			if (error instanceof AuthServiceError) {
				next(new HttpError(error.message, error.statusCode));
			} else {
				next(error);
			}
		}
	}
);

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post(
	'/forgot-password',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { email } = req.body;

			if (!email) {
				throw new HttpError('Email is required', 400);
			}

			// Validate email format
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				throw new HttpError('Invalid email format', 400);
			}

			await authService.requestPasswordReset(email);

			// Always return success to prevent email enumeration
			res.json({
				message:
					'If an account with that email exists, a password reset link has been sent.',
			});
		} catch (error) {
			if (error instanceof AuthServiceError) {
				next(new HttpError(error.message, error.statusCode));
			} else {
				next(error);
			}
		}
	}
);

/**
 * POST /api/auth/reset-password
 * Reset password using token from email
 */
router.post(
	'/reset-password',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { token, password } = req.body;

			if (!token) {
				throw new HttpError('Reset token is required', 400);
			}

			if (!password) {
				throw new HttpError('New password is required', 400);
			}

			await authService.resetPassword(token, password);

			res.json({
				message:
					'Password has been reset successfully. You can now log in with your new password.',
			});
		} catch (error) {
			if (error instanceof AuthServiceError) {
				next(new HttpError(error.message, error.statusCode));
			} else {
				next(error);
			}
		}
	}
);

/**
 * GET /api/auth/linked-accounts
 * Get which auth methods are linked to the user's account
 */
router.get(
	'/linked-accounts',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = req.userId;
			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			const linkedAccounts = await authService.getLinkedAccounts(userId);

			res.json(linkedAccounts);
		} catch (error) {
			if (error instanceof AuthServiceError) {
				next(new HttpError(error.message, error.statusCode));
			} else {
				next(error);
			}
		}
	}
);

/**
 * POST /api/auth/set-password
 * Set a password for OAuth users (or update existing password without knowing current)
 * Only for users who don't have a password yet
 */
router.post(
	'/set-password',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = req.userId;
			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			const { password } = req.body;

			if (!password) {
				throw new HttpError('Password is required', 400);
			}

			// Check if user already has a password
			const linkedAccounts = await authService.getLinkedAccounts(userId);
			if (linkedAccounts.hasPassword) {
				throw new HttpError(
					'You already have a password. Use change-password endpoint instead.',
					400
				);
			}

			await authService.setPassword(userId, password);

			res.json({
				message:
					'Password set successfully. You can now log in with email and password.',
			});
		} catch (error) {
			if (error instanceof AuthServiceError) {
				next(new HttpError(error.message, error.statusCode));
			} else {
				next(error);
			}
		}
	}
);

/**
 * DELETE /api/auth/remove-password
 * Remove password from account (must have another login method)
 */
router.delete(
	'/remove-password',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = req.userId;
			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			await authService.removePassword(userId);

			res.json({
				message: 'Password removed successfully.',
			});
		} catch (error) {
			if (error instanceof AuthServiceError) {
				next(new HttpError(error.message, error.statusCode));
			} else {
				next(error);
			}
		}
	}
);

/**
 * POST /api/auth/link/google
 * Link a Google account to the current user
 */
router.post(
	'/link/google',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = req.userId;
			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			const { credential } = req.body;

			if (!credential) {
				throw new HttpError('Google credential is required', 400);
			}

			await oauthService.linkGoogle(userId, credential);

			res.json({
				message: 'Google account linked successfully.',
			});
		} catch (error) {
			if (error instanceof OAuthServiceError) {
				next(new HttpError(error.message, error.statusCode));
			} else {
				next(error);
			}
		}
	}
);

/**
 * POST /api/auth/link/apple
 * Link an Apple account to the current user
 */
router.post(
	'/link/apple',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = req.userId;
			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			const { identityToken, user } = req.body;

			if (!identityToken) {
				throw new HttpError('Apple identity token is required', 400);
			}

			await oauthService.linkApple(userId, identityToken, user);

			res.json({
				message: 'Apple account linked successfully.',
			});
		} catch (error) {
			if (error instanceof OAuthServiceError) {
				next(new HttpError(error.message, error.statusCode));
			} else {
				next(error);
			}
		}
	}
);

/**
 * DELETE /api/auth/unlink/:provider
 * Unlink an OAuth provider from the current user
 */
router.delete(
	'/unlink/:provider',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const userId = req.userId;
			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			const { provider } = req.params;

			if (provider !== 'google' && provider !== 'apple') {
				throw new HttpError(
					'Invalid provider. Must be "google" or "apple".',
					400
				);
			}

			await oauthService.unlinkProvider(userId, provider);

			res.json({
				message: `${
					provider.charAt(0).toUpperCase() + provider.slice(1)
				} account unlinked successfully.`,
			});
		} catch (error) {
			if (error instanceof OAuthServiceError) {
				next(new HttpError(error.message, error.statusCode));
			} else {
				next(error);
			}
		}
	}
);

export default router;
