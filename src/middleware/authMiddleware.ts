import type { RequestHandler } from 'express';
import { verifyAuthToken } from '../services/authService.js';
import type { AuthenticatedUser } from '../types/auth.js';

declare global {
	namespace Express {
		interface Request {
			user?: AuthenticatedUser;
		}
	}
}

export const authenticateUser: RequestHandler = (req, res, next) => {
	const authorization = req.get('authorization');
	const match = authorization?.match(/^Bearer\s+(\S+)$/i);

	if (!match) {
		return res.status(401).json({ message: 'Bearer token is required' });
	}

	const token = match[1];

	if (!token) {
		return res.status(401).json({ message: 'Bearer token is required' });
	}

	try {
		req.user = verifyAuthToken(token);
		return next();
	} catch {
		return res.status(401).json({ message: 'Invalid or expired token' });
	}
};

export const authorizeRoles = (...allowedRoles: string[]): RequestHandler =>
	(req, res, next) => {
		if (!req.user) {
			return res.status(401).json({ message: 'Authentication is required' });
		}

		if (!allowedRoles.includes(req.user.role)) {
			return res.status(403).json({ message: 'You are not authorized to access this resource' });
		}

		return next();
	};

