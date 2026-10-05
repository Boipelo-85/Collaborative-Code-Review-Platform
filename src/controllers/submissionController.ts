import type { Request, Response } from 'express';
import { query, withTransaction } from '../config/database.js';
import { createNotification } from '../services/notificationService.js';
import { publishNotification } from '../services/webSocketService.js';

// Ensures IDs are positive integers
const parseId = (value: unknown): number | null => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};
const submissionStatuses = new Set(['pending', 'in_review', 'approved', 'changes_requested']);

//Creating submission section
export const createSubmission = async (req: Request, res: Response) => {
    try {
        const { project_id, content, status } = req.body;

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }

        const projectId = parseId(project_id);
        if (projectId === null) {
            return res.status(400).json({ message: 'project_id must be a positive integer' });
        }
        if (!content || typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ message: 'Submission content is required' });
        }

        if (status !== undefined && status !== 'pending') {
            return res.status(400).json({
                message: 'New submissions must have pending status'
            });
        }

        const projectResult = await query(
            'SELECT id FROM Projects WHERE id = $1',
            [projectId]
        );
        if (projectResult.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const submissionResult = await query(
            'INSERT INTO submissions (project_id, author_id, submitter_id, content) VALUES ($1, $2, $2, $3) RETURNING *',
            [projectId, req.user.id, content.trim()]
        );
        return res.status(201).json(submissionResult.rows[0]);

    } catch (error) {
        console.error('Failed to create submission:', error);
        return res.status(500).json({ message: 'Failed to create submission' });
    }
};
//Retrieve projects submissions from the database
export const getProjectSubmissions = async (req: Request, res: Response) => {
    try {
        const projectId = parseId(req.params.id ?? req.params.projectId);

        if (projectId === null) {
            return res.status(400).json({ message: 'projectId must be a positive integer' });
        }

        const projectResult = await query(
            'SELECT id FROM Projects WHERE id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const submissionsResult = await query(
            'SELECT * FROM submissions WHERE project_id = $1 ORDER BY submission_id DESC',
            [projectId]
        );

        return res.status(200).json(submissionsResult.rows);
    } catch (error) {
        console.error('Failed to retrieve project submissions:', error);
        return res.status(500).json({ message: 'Failed to retrieve project submissions' });
    }
};
//Retrieve  submission by ID section
export const getSubmissionById = async (req: Request, res: Response) => {
    try {
        const submissionId = parseId(req.params.id);

        if (submissionId === null) {
            return res.status(400).json({ message: 'submissionId must be a positive integer' });
        }
        const submissionResult = await query(
            'SELECT * FROM submissions WHERE submission_id = $1',
            [submissionId]
        );

        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        return res.status(200).json(submissionResult.rows[0]);

    } catch (error) {

        console.error('Failed to retrieve submission:', error);
        return res.status(500).json({ message: 'Failed to retrieve submission' });
    }
};
//Update the submission status section
export const updateSubmissionStatus = async (req: Request, res: Response) => {

    try {

        const submissionId = parseId(req.params.id);

        const { status } = req.body;

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }

        if (submissionId === null) {
            return res.status(400).json({ message: 'submissionId must be a positive integer' });
        }

        if (typeof status !== 'string' || !submissionStatuses.has(status.trim())) {
            return res.status(400).json({
                message: 'status must be one of pending, in_review, approved, or changes_requested'
            });
        }
        if (status.trim() === 'approved' || status.trim() === 'changes_requested') {
            return res.status(400).json({
                message: 'Use the approve or request-changes endpoint to record review decisions'
            });
        }

        const existingSubmission = await query(
            `SELECT s.*, p.owner_id
             FROM submissions s
             JOIN Projects p ON p.id = s.project_id
             WHERE s.submission_id = $1`,
            [submissionId]
        );

        if (existingSubmission.rows.length === 0) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        const submission = existingSubmission.rows[0];
        if (req.user.role !== 'Admin' && req.user.role !== 'Reviewer' && req.user.id !== submission.owner_id) {
            return res.status(403).json({ message: 'Only reviewers, admins, or the project owner can update submission status' });
        }

        const updatedSubmission = await query(
            'UPDATE submissions SET status = $1 WHERE submission_id = $2 RETURNING *',
            [status.trim(), submissionId]
        );

        return res.status(200).json(updatedSubmission.rows[0]);

    } catch (error) {

        console.error('Failed to update submission status:', error);
        return res.status(500).json({ message: 'Failed to update submission status' });

    }
};

const recordSubmissionReview = async (
    req: Request,
    res: Response,
    decision: 'approved' | 'changes_requested'
) => {
    try {
        const submissionId = parseId(req.params.id);

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }
        const reviewer = req.user;

        if (submissionId === null) {
            return res.status(400).json({ message: 'submissionId must be a positive integer' });
        }

        const body = req.body as Record<string, unknown> | null;
        if (body !== undefined && body !== null && (typeof body !== 'object' || Array.isArray(body))) {
            return res.status(400).json({ message: 'Request body must be a JSON object' });
        }

        const commentValue = body?.comment;
        if (commentValue !== undefined && commentValue !== null && typeof commentValue !== 'string') {
            return res.status(400).json({ message: 'comment must be a string or null' });
        }
        const comment = typeof commentValue === 'string' ? commentValue.trim() || null : null;

        const result = await withTransaction(async (client) => {
            const submissionResult = await client.query(
                `SELECT s.*, p.owner_id
                 FROM submissions s
                 JOIN Projects p ON p.id = s.project_id
                 WHERE s.submission_id = $1
                 FOR UPDATE OF s`,
                [submissionId]
            );

            if (submissionResult.rows.length === 0) {
                return { notFound: true as const };
            }

            const submission = submissionResult.rows[0];
            const canReview = reviewer.role === 'Admin'
                || reviewer.role === 'Reviewer'
                || reviewer.id === submission.owner_id;

            if (!canReview) {
                return { forbidden: true as const };
            }

            const updatedSubmission = await client.query(
                'UPDATE submissions SET status = $1 WHERE submission_id = $2 RETURNING *',
                [decision, submissionId]
            );
            const reviewResult = await client.query(
                `INSERT INTO Reviews (submission_id, reviewer_id, decision, comment)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [submissionId, reviewer.id, decision, comment]
            );

            const submitterId = submission.submitter_id;
            const notification = submitterId !== reviewer.id
                ? await createNotification(
                    client,
                    submitterId,
                    decision === 'approved' ? 'review_approved' : 'review_changes_requested',
                    decision === 'approved'
                        ? `Your submission #${submissionId} was approved.`
                        : `Changes were requested for your submission #${submissionId}.`
                )
                : null;

            return {
                submission: updatedSubmission.rows[0],
                review: reviewResult.rows[0],
                notification
            };
        });

        if ('notFound' in result) {
            return res.status(404).json({ message: 'Submission not found' });
        }
        if ('forbidden' in result) {
            return res.status(403).json({ message: 'Only reviewers, admins, or the project owner can review submissions' });
        }

        if (result.notification) {
            publishNotification(result.notification);
        }

        return res.status(200).json({
            message: decision === 'approved'
                ? 'Submission approved successfully'
                : 'Changes requested successfully',
            submission: result.submission,
            review: result.review
        });

    } catch (error) {
        const action = decision === 'approved' ? 'approve submission' : 'request changes';
        console.error(`Failed to ${action}:`, error);
        return res.status(500).json({ message: `Failed to ${action}` });
    }
};

export const approveSubmission = (req: Request, res: Response) =>
    recordSubmissionReview(req, res, 'approved');

export const requestSubmissionChanges = (req: Request, res: Response) =>
    recordSubmissionReview(req, res, 'changes_requested');

export const getSubmissionReviews = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }

        const submissionId = parseId(req.params.id);
        if (submissionId === null) {
            return res.status(400).json({ message: 'submissionId must be a positive integer' });
        }

        const submissionResult = await query(
            'SELECT submission_id FROM submissions WHERE submission_id = $1',
            [submissionId]
        );
        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        const reviewResult = await query(
            `SELECT r.*, u.name AS reviewer_name, u.role AS reviewer_role
             FROM Reviews r
             JOIN Users u ON u.id = r.reviewer_id
             WHERE r.submission_id = $1
             ORDER BY r.created_at ASC, r.review_id ASC`,
            [submissionId]
        );

        return res.status(200).json(reviewResult.rows);
    } catch (error) {
        console.error('Failed to retrieve submission reviews:', error);
        return res.status(500).json({ message: 'Failed to retrieve submission reviews' });
    }
};

//Remove the submission section
export const deleteSubmission = async (req: Request, res: Response) => {

    try {
        const submissionId = parseId(req.params.id);

        if (!req.user) {

            return res.status(401).json({ message: 'Authentication is required' });
        }

        if (submissionId === null) {
            return res.status(400).json({ message: 'submissionId must be a positive integer' });
        }

        const deletedSubmission = await query(
            'DELETE FROM submissions WHERE submission_id = $1 RETURNING *',
            [submissionId]
        );

        if (deletedSubmission.rows.length === 0) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        return res.status(200).json({
            message: 'Submission deleted successfully',
            submission: deletedSubmission.rows[0]
        });

    } catch (error) {
    
        console.error('Failed to delete submission:', error);
        return res.status(500).json({ message: 'Failed to delete submission' });
    }

};
