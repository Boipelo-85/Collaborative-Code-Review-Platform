import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../config/database.js';
import { assertJwtSecretConfigured, createAuthToken } from '../services/authService.js';

//User Registration section 
export const register = async (req: Request, res: Response) => {
    try {
        assertJwtSecretConfigured();

        const body = req.body as Record<string, unknown> | null;

        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return res.status(400).json({ message: 'A JSON request body is required' });
        }

        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const displayPicture = body.display_picture === undefined || body.display_picture === null
            ? null
            : typeof body.display_picture === 'string'
                ? body.display_picture.trim()
                : undefined;
        const cellphone = body.cellphone === undefined || body.cellphone === null
            ? null
            : typeof body.cellphone === 'number' && Number.isInteger(body.cellphone)
                ? body.cellphone
                : undefined;

        if (!name || !email || !password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                message: 'Name, a valid email, and password are required'
            });
        }

        if (displayPicture === undefined || cellphone === undefined) {
            return res.status(400).json({
                message: 'display_picture must be text and cellphone must be an integer'
            });
        }

        const existingUser = await query(
            'SELECT id FROM Users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'A user with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await query(
            `INSERT INTO Users (name, email, display_picture, cellphone, password, role)
             VALUES ($1, $2, $3, $4, $5, 'Submitter')
             RETURNING id, name, email, display_picture, cellphone, role`,
            [name, email, displayPicture, cellphone, hashedPassword]
        );

        const user = result.rows[0];

        return res.status(201).json({
            message: 'User registered successfully',
            user,
            token: createAuthToken({
                id: user.id,
                email: user.email,
                role: user.role
            })
        });
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
            return res.status(409).json({ message: 'A user with this email already exists' });
        }

        console.error('Registration failed:', error);
        return res.status(500).json({ message: 'Registration failed' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        assertJwtSecretConfigured();

        const body = req.body as Record<string, unknown> | null;

        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return res.status(400).json({ message: 'A JSON request body is required' });
        }

        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const result = await query(
            'SELECT id, name, email, password, role FROM Users WHERE email = $1',
            [email]
        );
        const user = result.rows[0];

        if (!user || typeof user.password !== 'string' || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const { password: _password, ...publicUser } = user;

        return res.status(200).json({
            message: 'Login successful',
            user: publicUser,
            token: createAuthToken({
                id: user.id,
                email: user.email,
                role: user.role
            })
        });
    } catch (error) {
        console.error('Login failed:', error);
        return res.status(500).json({ message: 'Login failed' });
    }
};

const parseUserId = (value: unknown): number | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const canManageProfile = (req: Request, userId: number): boolean =>
    req.user?.id === userId || req.user?.role === 'Admin';

const isUniqueConstraintError = (error: unknown): boolean =>
    typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';

// Fetches user by ID, requires authentication, checks if requester is the user or an admin. Returns profile fields.
export const getUserProfile = async (req: Request, res: Response) => {
    const userId = parseUserId(req.params.id);

    if (userId === null) {
        return res.status(400).json({ message: 'id must be a positive integer' });
    }

    if (!req.user) {
        return res.status(401).json({ message: 'Authentication is required' });
    }

    if (!canManageProfile(req, userId)) {
        return res.status(403).json({ message: 'You are not authorized to view this profile' });
    }

    try {
        const result = await query(
            `SELECT id, name, email, display_picture, cellphone, role
             FROM Users WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Failed to retrieve user profile:', error);
        return res.status(500).json({ message: 'Failed to retrieve user profile' });
    }
};
//Validates fields individually (name, email, display_picture, cellphone). Builds dynamic SQL update. Handles uniqueness errors. Requires auth and authorization.
export const updateUserProfile = async (req: Request, res: Response) => {
    const userId = parseUserId(req.params.id);

    if (userId === null) {
        return res.status(400).json({ message: 'id must be a positive integer' });
    }

    if (!req.user) {
        return res.status(401).json({ message: 'Authentication is required' });
    }

    if (!canManageProfile(req, userId)) {
        return res.status(403).json({ message: 'You are not authorized to update this profile' });
    }

    const body = req.body as Record<string, unknown> | null;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ message: 'A JSON request body is required' });
    }

    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    const addField = (column: string, value: string | number | null) => {
        values.push(value);
        fields.push(`${column} = $${values.length}`);
    };

    if ('name' in body) {
        if (typeof body.name !== 'string' || !body.name.trim()) {
            return res.status(400).json({ message: 'name must be a non-empty string' });
        }
        addField('name', body.name.trim());
    }

    if ('email' in body) {
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'email must be valid' });
        }
        addField('email', email);
    }

    if ('display_picture' in body) {
        if (body.display_picture !== null && typeof body.display_picture !== 'string') {
            return res.status(400).json({ message: 'display_picture must be text or null' });
        }
        addField('display_picture', typeof body.display_picture === 'string' ? body.display_picture.trim() : null);
    }

    if ('cellphone' in body) {
        if (body.cellphone !== null && (typeof body.cellphone !== 'number' || !Number.isInteger(body.cellphone))) {
            return res.status(400).json({ message: 'cellphone must be an integer or null' });
        }
        addField('cellphone', typeof body.cellphone === 'number' ? body.cellphone : null);
    }

    if (fields.length === 0) {
        return res.status(400).json({ message: 'Provide at least one profile field to update' });
    }

    values.push(userId);

    try {
        const result = await query(
            `UPDATE Users
             SET ${fields.join(', ')}
             WHERE id = $${values.length}
             RETURNING id, name, email, display_picture, cellphone, role`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return res.status(409).json({ message: 'A user with this email already exists' });
        }

        console.error('Failed to update user profile:', error);
        return res.status(500).json({ message: 'Failed to update user profile' });
    }
};
//Remove the user profile from the database
export const deleteUserProfile = async (req: Request, res: Response) => {
    const userId = parseUserId(req.params.id);

    if (userId === null) {
        return res.status(400).json({ message: 'id must be a positive integer' });
    }

    if (!req.user) {
        return res.status(401).json({ message: 'Authentication is required' });
    }

    if (!canManageProfile(req, userId)) {
        return res.status(403).json({ message: 'You are not authorized to delete this profile' });
    }

    try {
        const result = await query(
            'DELETE FROM Users WHERE id = $1 RETURNING id',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(204).send();
    } catch (error) {
        console.error('Failed to delete user profile:', error);
        return res.status(500).json({ message: 'Failed to delete user profile' });
    }
};
