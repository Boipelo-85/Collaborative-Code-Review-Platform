import express from 'express';
import { deleteComment, updateComment } from '../controllers/commentController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { validateBody, validateIdParam, validationRules } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.use(authenticateUser);

router.put('/:id', validateIdParam(), validateBody({
	content: { required: true, validate: validationRules.nonEmptyString('content') }
}), updateComment);
router.delete('/:id', validateIdParam(), deleteComment);

export default router;
