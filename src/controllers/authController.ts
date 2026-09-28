import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../config/database.js';

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, display_picture, cellphone } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ 
                error: 'Name, email, and password are required' 
            });
        }

        // Check if user already exists
        const existingUser = await query(
            'SELECT id FROM Users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ 
                error: 'User with this email already exists' 
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new user
        const result = await query(
            `INSERT INTO Users (name, email, password, display_picture, cellphone)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, email, display_picture, cellphone`,
            [name, email, hashedPassword, display_picture || null, cellphone || null]
        );

        const newUser = result.rows[0];

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                display_picture: newUser.display_picture,
                cellphone: newUser.cellphone
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            error: 'Internal server error during registration' 
        });
    }
};
