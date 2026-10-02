import type { Request, Response } from 'express';
import { query } from '../config/database.js';

// Ensures IDs are positive integers
const parseId = (value: unknown): number | null => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};
//Creating submission section
export const createSubmission = async (req: Request, res: Response) => {
    try {
        const { project_id, content, status } = req.body;

        if (!req.user){

            return res.status(401).json({ message: 'Authentication is required' });
        }
        const projectId = parseId(project_id);
        if (projectId === null) {
            return res.status(400).json({ message: 'project_id must be a positive integer' });
        }
        if (!content || typeof content !== 'string' || !content.trim()) {

            return res.status(400).json({ message: 'Submission content is required' });
        }
        if (!status || typeof status !== 'string' || !status.trim()) {
            return res.status(400).json({ message: 'Submission status is required' });
        }
        const projectResult = await query(
            'SELECT id FROM Projects WHERE id = $1',
            [projectId]
            
        );
        if (projectResult.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }
        const submissionResult = await query(

            'INSERT INTO submissions (project_id, content, status) VALUES ($1, $2, $3) RETURNING *',
            [projectId, content.trim(), status.trim()]

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

        if (!status || typeof status !== 'string' || !status.trim()) {
            return res.status(400).json({ message: 'status is required' });
        }

        const existingSubmission = await query(
            'SELECT * FROM submissions WHERE submission_id = $1',
            [submissionId]
        );

        if (existingSubmission.rows.length === 0) {
            return res.status(404).json({ message: 'Submission not found' });
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

export const approveSubmission = async (req: Request, res: Response) => {
    try {
        const submissionId = parseId(req.params.id);

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication is required' });
        }

        if (submissionId === null) {
            return res.status(400).json({ message: 'submissionId must be a positive integer' });
        }

        const submissionResult = await query(
            'SELECT s.*, p.owner_id FROM submissions s JOIN Projects p ON p.id = s.project_id WHERE s.submission_id = $1',
            [submissionId]
        );

        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        const submission = submissionResult.rows[0];

        if (req.user.role !== 'Admin' && req.user.id !== submission.owner_id) {
            return res.status(403).json({ message: 'Only admins or the project owner can approve submissions' });
        }

        const updatedSubmission = await query(
            'UPDATE submissions SET status = $1 WHERE submission_id = $2 RETURNING *',
            ['approved', submissionId]
        );

        return res.status(200).json({
            message: 'Submission approved successfully',
            submission: updatedSubmission.rows[0]
        });

    } catch (error) {
        console.error('Failed to approve submission:', error);
        return res.status(500).json({ message: 'Failed to approve submission' });
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

