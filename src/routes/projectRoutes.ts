import express from 'express';
import {
    createProject,
    deleteProject,
    getProjectById,
    getProjects,
    updateProject
} from '../controllers/projectController.js';

const router = express.Router();

router.post('/', createProject);
router.get('/', getProjects);
router.get('/:projectId', getProjectById);
router.put('/:projectId/users/:userId', updateProject);
router.delete('/:projectId/users/:userId', deleteProject);

export default router;