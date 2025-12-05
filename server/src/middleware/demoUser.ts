import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models';

// Extend Express Request to include userId
declare global {
	namespace Express {
		interface Request {
			userId?: string;
		}
	}
}

// Demo user ID for MVP - in production, this would come from authentication
const DEMO_USER_ID = process.env.DEMO_USER_ID || '000000000000000000000001';

export const demoUserMiddleware = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		// Check if demo user exists, create if not
		let user = await User.findById(DEMO_USER_ID);

		if (!user) {
			// Create demo user with specific ID
			user = await User.create({
				_id: new mongoose.Types.ObjectId(DEMO_USER_ID),
				email: 'demo@theveganaisle.app',
				displayName: 'Demo User',
			});
		}

		req.userId = DEMO_USER_ID;
		next();
	} catch (error) {
		// If we can't create/find demo user, still continue but log the error
		console.error('Demo user middleware error:', error);
		req.userId = DEMO_USER_ID;
		next();
	}
};
