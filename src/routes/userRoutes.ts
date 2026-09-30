import express from 'express';
import {
	deleteUserProfile,
	getUserProfile,
	register,
	updateUserProfile
} from '../controllers/userController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Register a new user
router.post('/', register);

// Protect the user routes below
router.use(authenticateUser);

// Get a user's profile by ID
router.get('/:id', getUserProfile);

// Update a user's profile
router.put('/:id', updateUserProfile);

// Delete a user's profile
router.delete('/:id', deleteUserProfile);

export default router;