import express from 'express';
import { addCommentToSubmission } from '../controllers/commentController.js';
import {
  createSubmission,
  deleteSubmission,
  getSubmissionById,
  getProjectSubmissions,
  updateSubmissionStatus,
} from '../controllers/submissionController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all submission routes
router.use(authenticateUser);

// Create a new submission
router.post('/', createSubmission);

// Add a comment to a submission
router.post('/:id/comments', addCommentToSubmission);

// Get all submissions for a specific project (with optional filters/pagination)
router.get('/projects/:projectId/submissions', getProjectSubmissions);

// Get a single submission by ID
router.get('/:id', getSubmissionById);

// Update submission status (partial update)
router.patch('/:id/status', updateSubmissionStatus);

// Delete a submission
router.delete('/:id', deleteSubmission);

export default router;
