import type { Request, Response } from 'express';
export declare const register: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getUserProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateUserProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteUserProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=userController.d.ts.map