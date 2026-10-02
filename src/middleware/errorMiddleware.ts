import type { ErrorRequestHandler, RequestHandler } from 'express';

type ErrorWithMetadata = Error & {
	code?: string;
	status?: number;
	statusCode?: number;
	type?: string;
};

export const notFoundHandler: RequestHandler = (req, res) =>
	res.status(404).json({
		message: `Route ${req.method} ${req.originalUrl} was not found.`
	});

export const errorHandler: ErrorRequestHandler = (error: ErrorWithMetadata, _req, res, _next) => {
	if (error.type === 'entity.parse.failed') {
		return res.status(400).json({
			message: 'Request body contains invalid JSON.',
			errors: [{ field: 'body', message: 'Check the JSON syntax and try again.' }]
		});
	}

	if (error.code === '23505') {
		return res.status(409).json({ message: 'A record with those details already exists.' });
	}

	if (error.code === '23503') {
		return res.status(400).json({ message: 'A referenced record does not exist.' });
	}

	if (error.code === '22P02') {
		return res.status(400).json({ message: 'One or more values have an invalid format.' });
	}

	const statusCode = error.statusCode ?? error.status;
	if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
		return res.status(statusCode).json({ message: error.message });
	}

	console.error('Unhandled request error:', error);
	return res.status(500).json({ message: 'An unexpected server error occurred.' });
};

