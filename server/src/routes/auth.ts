import { Router, Request, Response, NextFunction } from 'express';
import { authService, AuthServiceError } from '../services/authService';
import { authMiddleware } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      throw new HttpError('Email, password, and display name are required', 400);
    }

    const result = await authService.signup({ email, password, displayName });
    
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
});

/**
 * POST /api/auth/login
 * Login an existing user
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
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
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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
});

/**
 * PUT /api/auth/profile
 * Update user profile (requires authentication)
 */
router.put('/profile', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new HttpError('User not authenticated', 401);
    }

    const { displayName, email } = req.body;
    const user = await authService.updateProfile(userId, { displayName, email });
    
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
});

/**
 * POST /api/auth/change-password
 * Change user password (requires authentication)
 */
router.post('/change-password', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new HttpError('User not authenticated', 401);
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new HttpError('Current password and new password are required', 400);
    }

    await authService.changePassword(userId, currentPassword, newPassword);

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
});

export default router;

