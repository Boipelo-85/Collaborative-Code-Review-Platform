import express from 'express';
import { addProjectMember, createProject, deleteProject, getProjectById, getProjects,updateProject} from '../controllers/projectController.js';
import { getProjectSubmissions } from '../controllers/submissionController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateUser);

// Create a new project
router.post('/', createProject);

// Add a member to a project
router.post('/:id/members', addProjectMember);

// Get all projects
router.get('/', getProjects);

// Get all submissions for a project
router.get('/:id/submissions', getProjectSubmissions);

// Get a project by ID
router.get('/:projectId', getProjectById);

// Update project details for a user
router.put('/:projectId/users/:userId', updateProject);

// Remove a member from a project
router.delete('/:id/members/:userId', deleteProject);

// Delete a project member or project by project ID
router.delete('/:projectId/users/:userId', deleteProject);

export default router;