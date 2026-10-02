import type { Request, Response } from 'express';
import { query } from '../config/database.js';

// Ensures IDs are positive integers
const parseId = (value: unknown): number | null => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

// Create a project (owner membership)
export const createProject = async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;
        const ownerId = req.user?.id;

        if (!ownerId) {
            return res.status(401).json({ message: 'Authentication is required' });
        }

        if (!name) {
            return res.status(400).json({ message: 'Project name is required' });
        }

        const projectResult = await query(
            'INSERT INTO Projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
            [name, description, ownerId]
        );

        const project = projectResult.rows[0];

        // Add owner as member
        await query(
            'INSERT INTO ProjectMembers (project_id, user_id, role) VALUES ($1, $2, $3)',
            [project.id, ownerId, 'Owner']
        );

        return res.status(201).json(project);
    } catch (error) {
        console.error('Failed to create project:', error);
        return res.status(500).json({ message: 'Failed to create project' });
    }
};

// List all projects (metadata only)
export const getProjects = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM Projects ORDER BY created_at DESC');
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error('Failed to retrieve projects:', error);
        return res.status(500).json({ message: 'Failed to retrieve projects' });
    }
};

// Get project by ID (metadata + members)
export const getProjectById = async (req: Request, res: Response) => {
    try {
        const projectId = parseId(req.params.projectId);

        if (projectId === null) {
            return res.status(400).json({ message: 'projectId must be a positive integer' });
        }

        const projectResult = await query(
            'SELECT * FROM Projects WHERE id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const membersResult = await query(
            'SELECT user_id, role FROM ProjectMembers WHERE project_id = $1',
            [projectId]
        );

        return res.status(200).json({
            project: projectResult.rows[0],
            members: membersResult.rows
        });
    } catch (error) {
        console.error('Failed to retrieve project:', error);
        return res.status(500).json({ message: 'Failed to retrieve project' });
    }
};

// Assign user to project
export const addProjectMember = async (req: Request, res: Response) => {
    const projectId = parseId(req.params.id);
    const userId = parseId(req.body.user_id);

    if (projectId === null || userId === null) {
        return res.status(400).json({ message: 'Invalid project_id or user_id' });
    }

    if (!req.user) {
        return res.status(401).json({ message: 'Authentication is required' });
    }

    if (userId !== req.user.id && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Only admins can assign another user' });
    }

    try {
        const existing = await query(
            'SELECT * FROM ProjectMembers WHERE project_id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'User already a member' });
        }

        const result = await query(
            'INSERT INTO ProjectMembers (project_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
            [projectId, userId, 'Member']
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Failed to add member:', error);
        return res.status(500).json({ message: 'Failed to add member' });
    }
};

// Remove user from project
export const removeProjectMember = async (req: Request, res: Response) => {
    const projectId = parseId(req.params.id);
    const userId = parseId(req.params.userId);

    if (projectId === null || userId === null) {
        return res.status(400).json({ message: 'Invalid project_id or user_id' });
    }

    if (!req.user) {
        return res.status(401).json({ message: 'Authentication is required' });
    }

    if (userId !== req.user.id && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Only admins can remove another user' });
    }

    try {
        const result = await query(
            'DELETE FROM ProjectMembers WHERE project_id = $1 AND user_id = $2 RETURNING *',
            [projectId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Membership not found' });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Failed to remove member:', error);
        return res.status(500).json({ message: 'Failed to remove member' });
    }
};
//Update the project section
export const updateProject = async (req: Request, res: Response) => {
    try {
        const projectId = parseId(req.params.projectId);

        if (projectId === null) {
            return res.status(400).json({ message: 'projectId must be a positive integer' });
        }

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }

        const { name, description } = req.body;

        if (name === undefined && description === undefined) {
            return res.status(400).json({ message: 'At least one field to update is required' });
        }

        const projectResult = await query(
            'SELECT * FROM Projects WHERE id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const project = projectResult.rows[0];

        if (req.user.id !== project.owner_id && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'You can only update your own project' });
        }

        const updateResult = await query(
            'UPDATE Projects SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
            [name ?? null, description ?? null, projectId]
        );

        return res.status(200).json(updateResult.rows[0]);
    } catch (error) {
        console.error('Failed to update project:', error);
        return res.status(500).json({ message: 'Failed to update project' });
    }
};

export const deleteProject = async (req: Request, res: Response) => {
    try {
        const projectId = parseId(req.params.id ?? req.params.projectId);
        const userId = parseId(req.params.userId);

        if (projectId === null) {
            return res.status(400).json({ message: 'projectId must be a positive integer' });
        }

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }

        const projectResult = await query(
            'SELECT owner_id FROM Projects WHERE id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (req.user.id !== projectResult.rows[0].owner_id && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'You can only delete your own project' });
        }

        if (userId !== null) {
            const memberResult = await query(
                'DELETE FROM ProjectMembers WHERE project_id = $1 AND user_id = $2 RETURNING *',
                [projectId, userId]
            );

            if (memberResult.rows.length === 0) {
                return res.status(404).json({ message: 'Membership not found' });
            }

            return res.status(200).json(memberResult.rows[0]);
        }

        const deleteResult = await query(
            'DELETE FROM Projects WHERE id = $1 RETURNING *',
            [projectId]
        );

        return res.status(200).json({
            message: 'Project deleted successfully',
            project: deleteResult.rows[0]
        });
    } catch (error) {
        console.error('Failed to delete project:', error);
        return res.status(500).json({ message: 'Failed to delete project' });
    }
};
