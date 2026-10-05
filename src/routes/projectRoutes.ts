import express from 'express';
import { addProjectMember, createProject, deleteProject, getProjectById, getProjects, getProjectStats, removeProjectMember, updateProject } from '../controllers/projectController.js';
import { getProjectSubmissions } from '../controllers/submissionController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { validateBody, validateIdParam, validationRules } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.use(authenticateUser);

// Create a new project
router.post('/', validateBody({
	name: { required: true, validate: validationRules.nonEmptyString('name') },
	description: { validate: validationRules.nullableString('description') }
}), createProject);

// Add a member to a project
router.post('/:id/members', validateIdParam(), validateBody({
	user_id: { required: true, validate: validationRules.positiveInteger('user_id') }
}), addProjectMember);

// Get all projects
router.get('/', getProjects);

// Get all submissions for a project
router.get('/:id/submissions', validateIdParam(), getProjectSubmissions);

// Get project review and comment statistics
router.get('/:id/stats', validateIdParam(), getProjectStats);

// Get a project by ID
router.get('/:projectId', validateIdParam('projectId'), getProjectById);

// Update project details
router.put('/:projectId', validateIdParam('projectId'), validateBody({
	name: { validate: validationRules.nonEmptyString('name') },
	description: { validate: validationRules.nullableString('description') }
}, { atLeastOne: ['name', 'description'] }), updateProject);

// Remove a member from a project
router.delete('/:id/members/:userId', validateIdParam(), validateIdParam('userId'), removeProjectMember);

// Delete a project member or project by project ID
router.delete('/:projectId/users/:userId', validateIdParam('projectId'), validateIdParam('userId'), deleteProject);

export default router;