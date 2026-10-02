import jwt from 'jsonwebtoken';
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
};
export const assertJwtSecretConfigured = () => {
    getJwtSecret();
};
export const createAuthToken = (user) => jwt.sign(user, getJwtSecret(), { algorithm: 'HS256', expiresIn: '1h' });
export const verifyAuthToken = (token) => {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (typeof payload === 'string' ||
        typeof payload.id !== 'number' ||
        typeof payload.email !== 'string' ||
        typeof payload.role !== 'string') {
        throw new Error('Invalid authentication token');
    }
    return {
        id: payload.id,
        email: payload.email,
        role: payload.role
    };
};
//# sourceMappingURL=authService.js.map