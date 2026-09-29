import express from 'express';
import { addProjectMember, createProject, deleteProject, getProjectById, getProjects,updateProject} from '../controllers/projectController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateUser);
router.post('/', createProject);
router.post('/:id/members', addProjectMember);
router.get('/', getProjects);
router.get('/:projectId', getProjectById);
router.put('/:projectId/users/:userId', updateProject);
router.delete('/:id/members/:userId', deleteProject);
router.delete('/:projectId/users/:userId', deleteProject);

export default router;