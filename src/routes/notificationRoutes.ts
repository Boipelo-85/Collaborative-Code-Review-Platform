import express from 'express';
import { getUserNotifications } from '../controllers/notificationController.js';
import { validateIdParam } from '../middleware/validationMiddleware.js';

//Initialize the router to express function here
const router = express.Router({ mergeParams: true });

router.get('/', validateIdParam('id'), getUserNotifications);

export default router;
