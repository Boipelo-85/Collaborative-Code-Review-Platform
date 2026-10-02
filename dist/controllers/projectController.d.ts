import type { Request, Response } from 'express';
export declare const createProject: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getProjects: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getProjectById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const addProjectMember: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const removeProjectMember: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateProject: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteProject: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=projectController.d.ts.map