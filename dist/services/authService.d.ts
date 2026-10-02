import type { AuthenticatedUser } from '../types/auth.js';
export declare const assertJwtSecretConfigured: () => void;
export declare const createAuthToken: (user: AuthenticatedUser) => string;
export declare const verifyAuthToken: (token: string) => AuthenticatedUser;
//# sourceMappingURL=authService.d.ts.map