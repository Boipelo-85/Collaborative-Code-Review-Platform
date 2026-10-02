import type { RequestHandler } from 'express';
import type { AuthenticatedUser } from '../types/auth.js';
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}
export declare const authenticateUser: RequestHandler;
export declare const authorizeRoles: (...allowedRoles: string[]) => RequestHandler;
//# sourceMappingURL=authMiddleware.d.ts.map