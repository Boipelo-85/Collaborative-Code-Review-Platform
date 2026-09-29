import type { Request, Response } from 'express';
import { query } from '../config/database.js';

const parseId = (value: unknown): number | null => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

// Create a project
export const createProject = async (req: Request, res: Response) => {
    try {
        const projectId = parseId(req.body.project_id);
        const userId = req.body.user_id === undefined
            ? req.user?.id ?? null
            : parseId(req.body.user_id);

        if (projectId === null || userId === null) {
            return res.status(400).json({
                message: 'project_id and user_id must be positive integers'
            });
        }

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }

        if (userId !== req.user.id && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Only admins can assign another user to a project' });
        }

        const userResult = await query(
            'SELECT id FROM Users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const existingMembership = await query(
            'SELECT project_id FROM Projects WHERE project_id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (existingMembership.rows.length > 0) {
            return res.status(409).json({ message: 'User is already a member of this project' });
        }

        const result = await query(
            'INSERT INTO Projects (project_id, user_id) VALUES ($1, $2) RETURNING project_id, user_id',
            [projectId, userId]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Failed to create project:', error);
        return res.status(500).json({ message: 'Failed to create project' });
    }
};

// Get all projects
export const getProjects = async (req: Request, res: Response) => {
    try {
        const result = await query(
            'SELECT project_id, user_id FROM Projects ORDER BY project_id, user_id'
        );

        return res.status(200).json(result.rows);
    } catch (error) {
        console.error('Failed to retrieve projects:', error);
        return res.status(500).json({ message: 'Failed to retrieve projects' });
    }
};

// Get project by ID
export const getProjectById = async (req: Request, res: Response) => {
    try {
        const projectId = parseId(req.params.projectId);

        if (projectId === null) {
            return res.status(400).json({ message: 'projectId must be a positive integer' });
        }

        const result = await query(
            'SELECT project_id, user_id FROM Projects WHERE project_id = $1 ORDER BY user_id',
            [projectId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        return res.status(200).json(result.rows);
    } catch (error) {
        console.error('Failed to retrieve project:', error);
        return res.status(500).json({ message: 'Failed to retrieve project' });
    }
};

// Add the authenticated user, or let an admin assign another user, to a project
export const addProjectMember = async (req: Request, res: Response) => {
    const projectId = parseId(req.params.id);

    if (projectId === null) {
        return res.status(400).json({ message: 'id must be a positive integer' });
    }

    if (!req.user) {
        return res.status(401).json({ message: 'Authentication is required' });
    }

    const requestedUserId = req.body?.user_id === undefined
        ? req.user.id
        : parseId(req.body.user_id);

    if (requestedUserId === null) {
        return res.status(400).json({ message: 'user_id must be a positive integer' });
    }

    if (requestedUserId !== req.user.id && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Only admins can assign another user to a project' });
    }

    try {
        const userResult = await query(
            'SELECT id FROM Users WHERE id = $1',
            [requestedUserId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const existingMembership = await query(
            'SELECT project_id FROM Projects WHERE project_id = $1 AND user_id = $2',
            [projectId, requestedUserId]
        );

        if (existingMembership.rows.length > 0) {
            return res.status(409).json({ message: 'User is already a member of this project' });
        }

        const result = await query(
            'INSERT INTO Projects (project_id, user_id) VALUES ($1, $2) RETURNING project_id, user_id',
            [projectId, requestedUserId]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Failed to add project member:', error);
        return res.status(500).json({ message: 'Failed to add project member' });
    }
};

// Update project
export const updateProject = async (req: Request, res: Response) => {
    try {
        const projectId = parseId(req.params.projectId);
        const userId = parseId(req.params.userId); //Initialize the project ID section
        const updatedProjectId = req.body.project_id === undefined ? null : parseId(req.body.project_id);
        const updatedUserId = req.body.user_id === undefined ? null : parseId(req.body.user_id);

        if (projectId === null || userId === null) {
            return res.status(400).json({ message: 'projectId and userId must be positive integers' });
        }

        if (updatedProjectId === null && updatedUserId === null) {
            return res.status(400).json({ message: 'Provide a valid project_id or user_id to update' });
        }

        const result = await query(
            `UPDATE Projects
             SET project_id = COALESCE($1, project_id),
                 user_id = COALESCE($2, user_id)
             WHERE project_id = $3 AND user_id = $4
             RETURNING project_id, user_id`,
            [updatedProjectId, updatedUserId, projectId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Failed to update project:', error);
        return res.status(500).json({ message: 'Failed to update project' });
    }
};

// Delete project from the database
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const projectId = parseId(req.params.id ?? req.params.projectId);
        const userId = parseId(req.params.userId);

        if (projectId === null || userId === null) {
            return res.status(400).json({ message: 'projectId and userId must be positive integers' });
        }

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }

        if (userId !== req.user.id && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Only admins can remove another user from a project' });
        }

        const result = await query(
            'DELETE FROM Projects WHERE project_id = $1 AND user_id = $2 RETURNING project_id, user_id',
            [projectId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Project membership not found' });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Failed to delete project:', error);
        return res.status(500).json({ message: 'Failed to delete project' });
    }
};
