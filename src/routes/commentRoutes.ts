import express from 'express';
import { deleteComment, updateComment } from '../controllers/commentController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateUser);

router.put('/:id', updateComment);
router.delete('/:id', deleteComment);

export default router;
