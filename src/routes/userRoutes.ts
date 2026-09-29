import express from 'express';
import {
	deleteUserProfile,
	getUserProfile,
	register,
	updateUserProfile
} from '../controllers/userController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', register);
router.use(authenticateUser);
router.get('/:id', getUserProfile);
router.put('/:id', updateUserProfile);
router.delete('/:id', deleteUserProfile);

export default router;