import type { Request, Response } from 'express';
import { query } from '../config/database.js';

const parseId = (value: unknown): number | null => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

export const createProject = async (req: Request, res: Response) => {
    try {
        const projectId = parseId(req.body.project_id);
        const userId = parseId(req.body.user_id);

        if (projectId === null || userId === null) {
            return res.status(400).json({
                message: 'project_id and user_id must be positive integers'
            });
        }

        const result = await query(
            'INSERT INTO Projects (project_id, user_id) VALUES ($1, $2) RETURNING project_id, user_id',
            [projectId, userId]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Failed to create project assignment:', error);
        return res.status(500).json({
            message: "Failed to create project",
        });
    }
};

export const getProjects = async (req: Request, res: Response) => {
    try {
        const result = await query(
            'SELECT project_id, user_id FROM Projects ORDER BY project_id, user_id'
        );

        return res.status(200).json(result.rows);
    } catch (error) {
        console.error('Failed to retrieve projects:', error);
        return res.status(500).json({
            message: "Failed to retrieve projects",
        });
    }
};

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
        return res.status(500).json({
            message: 'Failed to retrieve project'
        });
    }
};

export const updateProject = async (req: Request, res: Response) => {
    try {
        const projectId = parseId(req.params.projectId);
        const userId = parseId(req.params.userId);
        const updatedProjectId = req.body.project_id === undefined
            ? null
            : parseId(req.body.project_id);
        const updatedUserId = req.body.user_id === undefined
            ? null
            : parseId(req.body.user_id);

        if (projectId === null || userId === null) {
            return res.status(400).json({
                message: 'projectId and userId must be positive integers'
            });
        }

        if (updatedProjectId === null && updatedUserId === null) {
            return res.status(400).json({
                message: 'Provide a valid project_id or user_id to update'
            });
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
            return res.status(404).json({ message: 'Project assignment not found' });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Failed to update project assignment:', error);
        return res.status(500).json({
            message: 'Failed to update project assignment'
        });
    }
};

export const deleteProject = async (req: Request, res: Response) => {
    try {
        const projectId = parseId(req.params.projectId);
        const userId = parseId(req.params.userId);

        if (projectId === null || userId === null) {
            return res.status(400).json({
                message: 'projectId and userId must be positive integers'
            });
        }

        const result = await query(
            'DELETE FROM Projects WHERE project_id = $1 AND user_id = $2 RETURNING project_id, user_id',
            [projectId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Project assignment not found' });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Failed to delete project assignment:', error);
        return res.status(500).json({
            message: 'Failed to delete project assignment'
        });
    }
};