import express from 'express';
import { addCommentToSubmission } from '../controllers/commentController.js';
import {
  approveSubmission,
  createSubmission,
  deleteSubmission,
  getSubmissionById,
  getProjectSubmissions,
  updateSubmissionStatus,
} from '../controllers/submissionController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { validateBody, validateIdParam, validationRules } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Protect all submission routes
router.use(authenticateUser);

// Create a new submission
router.post('/', validateBody({
  project_id: { required: true, validate: validationRules.positiveInteger('project_id') },
  content: { required: true, validate: validationRules.nonEmptyString('content') },
  status: { required: true, validate: validationRules.nonEmptyString('status') }
}), createSubmission);

// Add a comment to a submission
router.post('/:id/comments', validateIdParam(), validateBody({
  content: { required: true, validate: validationRules.nonEmptyString('content') }
}), addCommentToSubmission);

// Get all submissions for a specific project (with optional filters/pagination)
router.get('/projects/:projectId/submissions', validateIdParam('projectId'), getProjectSubmissions);

// Get a single submission by ID
router.get('/:id', validateIdParam(), getSubmissionById);

// Update submission status (partial update)
router.patch('/:id/status', validateIdParam(), validateBody({
  status: { required: true, validate: validationRules.nonEmptyString('status') }
}), updateSubmissionStatus);

// Approve a submission
router.patch('/:id/approve', validateIdParam(), approveSubmission);

// Delete a submission
router.delete('/:id', validateIdParam(), deleteSubmission);

export default router;
