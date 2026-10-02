import { verifyAuthToken } from '../services/authService.js';
// Authentication middleware
export const authenticateUser = (req, res, next) => {
    const authorization = req.get('authorization');
    if (!authorization) {
        return res.status(401).json({ message: 'Authentication is required' });
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
    }
    catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};
//Authorization middleware (role-based)
export const authorizeRoles = (...allowedRoles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication is required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'You are not authorized to access this resource' });
    }
    // Role is allowed continue
    return next();
};
//# sourceMappingURL=authMiddleware.js.map