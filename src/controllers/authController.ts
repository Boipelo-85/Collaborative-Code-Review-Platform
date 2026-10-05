import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../config/database.js';
import { createAuthToken } from '../services/authService.js';

//Register tha user aunthentication
export const register = async (req: Request, res: Response) => {
    try {
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
            user
        });
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
            return res.status(409).json({ message: 'A user with this email already exists' });
        }

        console.error('Registration failed:', error);
        return res.status(500).json({ message: 'Registration failed' });
    }
};
//Login section and validate the logins
export const login = async (req: Request, res: Response) => {
    try {
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
