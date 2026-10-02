import express from 'express';
import { login, register } from '../controllers/userController.js';
import { validateBody, validationRules } from '../middleware/validationMiddleware.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', validateBody({
	name: { required: true, validate: validationRules.nonEmptyString('name') },
	email: { required: true, validate: validationRules.email },
	password: { required: true, validate: validationRules.nonEmptyString('password') },
	display_picture: { validate: validationRules.nullableString('display_picture') },
	cellphone: { validate: validationRules.integerOrNull('cellphone') }
}), register);
router.post('/login', validateBody({
	email: { required: true, validate: validationRules.email },
	password: { required: true, validate: validationRules.nonEmptyString('password') }
}), login);

export default router;
