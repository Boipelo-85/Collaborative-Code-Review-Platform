import express from 'express';
import { register } from '../controllers/authController.js';
import {
	deleteUserProfile,
	getUserProfile,
	updateUserProfile
} from '../controllers/userController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { validateBody, validateIdParam, validationRules } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Register a new user
router.post('/', validateBody({
	name: { required: true, validate: validationRules.nonEmptyString('name') },
	email: { required: true, validate: validationRules.email },
	password: { required: true, validate: validationRules.nonEmptyString('password') },
	display_picture: { validate: validationRules.nullableString('display_picture') },
	cellphone: { validate: validationRules.integerOrNull('cellphone') }
}), register);

// Protect the user routes below
router.use(authenticateUser);

// Get a user's profile by ID
router.get('/:id', validateIdParam(), getUserProfile);

// Update a user's profile
router.put('/:id', validateIdParam(), validateBody({
	name: { validate: validationRules.nonEmptyString('name') },
	email: { validate: validationRules.email },
	display_picture: { validate: validationRules.nullableString('display_picture') },
	cellphone: { validate: validationRules.integerOrNull('cellphone') }
}, { atLeastOne: ['name', 'email', 'display_picture', 'cellphone'] }), updateUserProfile);

// Delete a user's profile
router.delete('/:id', validateIdParam(), deleteUserProfile);

export default router;