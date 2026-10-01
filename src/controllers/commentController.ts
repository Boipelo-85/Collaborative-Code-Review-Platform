import type { Request, Response } from 'express';
import { query } from '../config/database.js';

// Ensures IDs are positive integers
const parseId = (value: unknown): number | null => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

//Creating the comment to the submission section
export const addCommentToSubmission = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }

        const submissionId = parseId(req.params.id);
        const { content } = req.body;

        if (submissionId === null) {
            return res.status(400).json({ message: 'submissionId must be a positive integer' });
        }

        if (!content || typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ message: 'Comment content is required' });
        }

        const submissionResult = await query(
            'SELECT submission_id FROM submissions WHERE submission_id = $1',
            [submissionId]
        );

        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        const commentResult = await query(
            'INSERT INTO comments (submission_id, content) VALUES ($1, $2) RETURNING *',
            [submissionId, content.trim()]
        );

        return res.status(201).json(commentResult.rows[0]);
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

        const updatedComment = await query(
            'UPDATE comments SET content = $1 WHERE comment_id = $2 RETURNING *',
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

