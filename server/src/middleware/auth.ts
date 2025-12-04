import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { HttpError } from './errorHandler';

// Define UserRole locally to avoid importing User model (which imports mongoose)
type UserRole = 'user' | 'admin' | 'moderator';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      userId?: string;
    }
  }
}

// Export a type alias for authenticated requests
export type AuthenticatedRequest = Request;

/**
 * Middleware to authenticate JWT token
 * Attaches user info to request if valid token is provided
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new HttpError('No token provided', 401));
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    next(new HttpError('Invalid or expired token', 401));
    return;
  }

  req.user = payload;
  req.userId = payload.userId;
  next();
}

/**
 * Middleware to optionally authenticate JWT token
 * Does not fail if no token is provided, but attaches user info if valid
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    if (payload) {
      req.user = payload;
      req.userId = payload.userId;
    }
  }

  next();
}

/**
 * Middleware to require a specific role
 * Must be used after authMiddleware
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError('Authentication required', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new HttpError('Insufficient permissions', 403));
      return;
    }

    next();
  };
}

/**
 * Middleware to require admin role
 * Convenience wrapper for requireRole('admin')
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new HttpError('Authentication required', 401));
    return;
  }

  if (req.user.role !== 'admin') {
    next(new HttpError('Admin access required', 403));
    return;
  }

  next();
}

/**
 * Middleware to require admin or moderator role
 */
export function moderatorMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new HttpError('Authentication required', 401));
    return;
  }

  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    next(new HttpError('Moderator access required', 403));
    return;
  }

  next();
}

