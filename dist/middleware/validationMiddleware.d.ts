import type { RequestHandler } from 'express';
type FieldValidator = (value: unknown) => string | null;
type FieldRule = {
    required?: boolean;
    validate: FieldValidator;
};
type ValidationOptions = {
    atLeastOne?: string[];
};
export declare const validateBody: (rules: Record<string, FieldRule>, options?: ValidationOptions) => RequestHandler;
export declare const validateIdParam: (paramName?: string) => RequestHandler;
export declare const validationRules: {
    nonEmptyString: (field: string) => FieldValidator;
    email: (value: unknown) => string | null;
    positiveInteger: (field: string) => FieldValidator;
    nullableString: (field: string) => FieldValidator;
    integerOrNull: (field: string) => FieldValidator;
};
export {};
//# sourceMappingURL=validationMiddleware.d.ts.map