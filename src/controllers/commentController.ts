import type { Request, Response } from 'express';
import { query, withTransaction } from '../config/database.js';
import { createNotification } from '../services/notificationService.js';
import { publishNotification } from '../services/webSocketService.js';

// Ensures IDs are positive integers
const parseId = (value: unknown): number | null => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const canComment = (role: string): boolean =>
    role === 'Submitter' || role === 'Reviewer' || role === 'Admin';

//Creating the comment to the submission section
export const getSubmissionComments = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }

        if (!canComment(req.user.role)) {
            return res.status(403).json({ message: 'Your role is not allowed to view comments' });
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

        const commentsResult = await query(
            `SELECT c.*, u.name AS author_name, u.role AS author_role
             FROM comments c
             JOIN Users u ON u.id = c.author_id
             WHERE c.submission_id = $1
             ORDER BY c.created_at ASC, c.comment_id ASC`,
            [submissionId]
        );

        return res.status(200).json(commentsResult.rows);
    } catch (error) {
        console.error('Failed to retrieve submission comments:', error);
        return res.status(500).json({ message: 'Failed to retrieve submission comments' });
    }
};

//Creating the comment to the submission section
export const addCommentToSubmission = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }

        if (!canComment(req.user.role)) {
            return res.status(403).json({ message: 'Your role is not allowed to add comments' });
        }

        const submissionId = parseId(req.params.id);
        const { content } = req.body;

        if (submissionId === null) {
            return res.status(400).json({ message: 'submissionId must be a positive integer' });
        }

        if (!content || typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ message: 'Comment content is required' });
        }

        const result = await withTransaction(async (client) => {
            const submissionResult = await client.query(
                'SELECT submitter_id FROM submissions WHERE submission_id = $1',
                [submissionId]
            );
            if (submissionResult.rows.length === 0) {
                return { notFound: true as const };
            }

            const commentResult = await client.query(
                'INSERT INTO comments (submission_id, author_id, content) VALUES ($1, $2, $3) RETURNING *',
                [submissionId, req.user!.id, content.trim()]
            );

            const submitterId = submissionResult.rows[0].submitter_id;
            const notification = submitterId !== req.user!.id
                ? await createNotification(
                    client,
                    submitterId,
                    'comment',
                    `A new comment was added to your submission #${submissionId}.`
                )
                : null;

            return { comment: commentResult.rows[0], notification };
        });

        if ('notFound' in result) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        if (result.notification) {
            publishNotification(result.notification);
        }

        return res.status(201).json(result.comment);
    } catch (error) {
        console.error('Failed to add comment to submission:', error);
        return res.status(500).json({ message: 'Failed to add comment to submission' });
    }
};

//Updating the comment form where you did push the project
export const updateComment = async (req: Request, res: Response) => {
    try {
        const commentId = parseId(req.params.id);
        const { content } = req.body;

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }

        if (commentId === null) {
            return res.status(400).json({ message: 'commentId must be a positive integer' });
        }

        if (!content || typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ message: 'Comment content is required' });
        }

        const existingComment = await query(
            'SELECT author_id FROM comments WHERE comment_id = $1',
            [commentId]
        );

        if (existingComment.rows.length === 0) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (existingComment.rows[0].author_id !== req.user.id && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'You can only update your own comments' });
        }

        const updatedComment = await query(
            'UPDATE comments SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE comment_id = $2 RETURNING *',
            [content.trim(), commentId]
        );

        if (updatedComment.rows.length === 0) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        return res.status(200).json(updatedComment.rows[0]);
    } catch (error) {
        console.error('Failed to update comment:', error);
        return res.status(500).json({ message: 'Failed to update comment' });
    }
};
//Remove the comment section
export const deleteComment = async (req: Request, res: Response) => {
    try {
        const commentId = parseId(req.params.id);

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }

        if (commentId === null) {
            return res.status(400).json({ message: 'commentId must be a positive integer' });
        }

        const existingComment = await query(
            'SELECT author_id FROM comments WHERE comment_id = $1',
            [commentId]
        );

        if (existingComment.rows.length === 0) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (existingComment.rows[0].author_id !== req.user.id && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'You can only delete your own comments' });
        }

        const deletedComment = await query(
            'DELETE FROM comments WHERE comment_id = $1 RETURNING *',
            [commentId]
        );

        if (deletedComment.rows.length === 0) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        return res.status(200).json({
            message: 'Comment deleted successfully',
            comment: deletedComment.rows[0]
        });
    } catch (error) {
        console.error('Failed to delete comment:', error);
        return res.status(500).json({ message: 'Failed to delete comment' });
    }
};
