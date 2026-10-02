import type { RequestHandler } from 'express';
import { verifyAuthToken } from '../services/authService.js';
import type { AuthenticatedUser } from '../types/auth.js';

// Extend Express's Request type to include a user property
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}

// Authentication middleware
// For local testing/Postman, requests without an Authorization header are allowed to pass through.
// If a token is supplied, it is still validated normally.
export const authenticateUser: RequestHandler = (req, res, next) => {
    const authorization = req.get('authorization');

    if (!authorization) {
        return next();
    }

    const match = authorization.match(/^Bearer\s+(\S+)$/i);

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

//Authorization middleware (role-based)
export const authorizeRoles = (...allowedRoles: string[]): RequestHandler =>
    (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }
if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'You are not authorized to access this resource' });
        }

        // Role is allowed continue
        return next();
    };
