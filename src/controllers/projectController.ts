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

export const getProjectStats = async (req: Request, res: Response) => {
    const projectId = parseId(req.params.id);

    if (projectId === null) {
        return res.status(400).json({ message: 'projectId must be a positive integer' });
    }

    try {
        const projectResult = await query(
            'SELECT id FROM Projects WHERE id = $1',
            [projectId]
        );
        if (projectResult.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const result = await query(
            `WITH project_submissions AS (
                SELECT submission_id, created_at
                FROM submissions
                WHERE project_id = $1
            ),
            project_reviews AS (
                SELECT r.review_id, r.submission_id, r.reviewer_id, r.decision, r.created_at
                FROM Reviews r
                JOIN project_submissions s ON s.submission_id = r.submission_id
            ),
            decision_totals AS (
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE decision = 'approved') AS approved,
                    COUNT(*) FILTER (WHERE decision = 'changes_requested') AS rejected
                FROM project_reviews
            ),
            first_reviews AS (
                SELECT submission_id, MIN(created_at) AS first_reviewed_at
                FROM project_reviews
                GROUP BY submission_id
            ),
            reviewer_activity AS (
                SELECT
                    r.reviewer_id,
                    u.name AS reviewer_name,
                    COUNT(*) AS review_count,
                    COUNT(*) FILTER (WHERE r.decision = 'approved') AS approved_count,
                    COUNT(*) FILTER (WHERE r.decision = 'changes_requested') AS rejected_count
                FROM project_reviews r
                JOIN Users u ON u.id = r.reviewer_id
                GROUP BY r.reviewer_id, u.name
            ),
            comment_counts AS (
                SELECT s.submission_id, COUNT(c.comment_id) AS comment_count
                FROM project_submissions s
                JOIN Comments c ON c.submission_id = s.submission_id
                GROUP BY s.submission_id
            )
            SELECT
                (SELECT COUNT(*) FROM project_submissions) AS submission_count,
                (SELECT total FROM decision_totals) AS review_count,
                (
                    SELECT ROUND(
                        AVG(EXTRACT(EPOCH FROM (f.first_reviewed_at - s.created_at)) / 3600)::numeric,
                        2
                    )
                    FROM project_submissions s
                    JOIN first_reviews f ON f.submission_id = s.submission_id
                ) AS average_review_time_hours,
                (SELECT approved FROM decision_totals) AS approved_count,
                (SELECT rejected FROM decision_totals) AS rejected_count,
                ROUND(
                    100.0 * (SELECT approved FROM decision_totals)
                    / NULLIF((SELECT total FROM decision_totals), 0),
                    2
                ) AS approved_percentage,
                ROUND(
                    100.0 * (SELECT rejected FROM decision_totals)
                    / NULLIF((SELECT total FROM decision_totals), 0),
                    2
                ) AS rejected_percentage,
                COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'reviewer_id', reviewer_id,
                                'reviewer_name', reviewer_name,
                                'review_count', review_count,
                                'approved_count', approved_count,
                                'rejected_count', rejected_count
                            )
                            ORDER BY review_count DESC, reviewer_id ASC
                        )
                        FROM reviewer_activity
                    ),
                    '[]'::jsonb
                ) AS reviewer_activity,
                (
                    SELECT jsonb_build_object(
                        'submission_id', submission_id,
                        'comment_count', comment_count
                    )
                    FROM comment_counts
                    ORDER BY comment_count DESC, submission_id ASC
                    LIMIT 1
                ) AS most_commented_submission`,
            [projectId]
        );

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Failed to retrieve project stats:', error);
        return res.status(500).json({ message: 'Failed to retrieve project stats' });
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

    try {
        const projectResult = await query(
            'SELECT owner_id FROM Projects WHERE id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isProjectOwner = req.user.id === projectResult.rows[0].owner_id;
        const isAddingSelf = userId === req.user.id;
        if (!isProjectOwner && req.user.role !== 'Admin' && !isAddingSelf) {
            return res.status(403).json({ message: 'Only the project owner or an admin can add another user' });
        }

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

    try {
        const projectResult = await query(
            'SELECT owner_id FROM Projects WHERE id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isProjectOwner = req.user.id === projectResult.rows[0].owner_id;
        const isRemovingSelf = userId === req.user.id;
        if (!isProjectOwner && req.user.role !== 'Admin' && !isRemovingSelf) {
            return res.status(403).json({ message: 'Only the project owner or an admin can remove another user' });
        }

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
        //creating the projectID variable 
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
