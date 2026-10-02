import type { RequestHandler } from 'express';

type FieldValidator = (value: unknown) => string | null;

type FieldRule = {
	required?: boolean;
	validate: FieldValidator;
};

type ValidationOptions = {
	atLeastOne?: string[];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

export const validateBody = (
	rules: Record<string, FieldRule>,
	options: ValidationOptions = {}
): RequestHandler => (req, res, next) => {
	if (!isObject(req.body)) {
		return res.status(400).json({
			message: 'Request body must be a JSON object.',
			errors: [{ field: 'body', message: 'A JSON object is required.' }]
		});
	}

	const errors: { field: string; message: string }[] = [];

	for (const [field, rule] of Object.entries(rules)) {
		if (!(field in req.body)) {
			if (rule.required) {
				errors.push({ field, message: `${field} is required.` });
			}
			continue;
		}

		const message = rule.validate(req.body[field]);
		if (message) {
			errors.push({ field, message });
		}
	}

	if (options.atLeastOne && !options.atLeastOne.some((field) => field in req.body)) {
		errors.push({
			field: 'body',
			message: `Provide at least one field to update: ${options.atLeastOne.join(', ')}.`
		});
	}

	if (errors.length > 0) {
		return res.status(400).json({
			message: 'Validation failed.',
			errors
		});
	}

	return next();
};

export const validateIdParam = (paramName = 'id'): RequestHandler => (req, res, next) => {
	const id = Number(req.params[paramName]);

	if (!Number.isInteger(id) || id <= 0) {
		return res.status(400).json({
			message: 'Validation failed.',
			errors: [{ field: paramName, message: `${paramName} must be a positive integer.` }]
		});
	}

	return next();
};

export const validationRules = {
	nonEmptyString: (field: string): FieldValidator => (value) =>
		typeof value === 'string' && value.trim().length > 0
			? null
			: `${field} must be a non-empty string.`,
	email: (value: unknown): string | null =>
		typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
			? null
			: 'email must be a valid email address.',
	positiveInteger: (field: string): FieldValidator => (value) =>
		Number.isInteger(value) && Number(value) > 0
			? null
			: `${field} must be a positive integer.`,
	nullableString: (field: string): FieldValidator => (value) =>
		value === null || typeof value === 'string'
			? null
			: `${field} must be a string or null.`,
	integerOrNull: (field: string): FieldValidator => (value) =>
		value === null || (typeof value === 'number' && Number.isInteger(value))
			? null
			: `${field} must be an integer or null.`
};

