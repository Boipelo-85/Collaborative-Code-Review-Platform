import type { Request, Response } from 'express';
export declare const createSubmission: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getProjectSubmissions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSubmissionById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateSubmissionStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const approveSubmission: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteSubmission: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=submissionController.d.ts.map