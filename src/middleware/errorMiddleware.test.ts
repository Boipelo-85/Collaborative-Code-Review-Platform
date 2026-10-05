import assert from 'node:assert/strict';
import test from 'node:test';

import { errorHandler, notFoundHandler } from './errorMiddleware.js';

const createMockResponse = () => {
	const res: any = {
		statusCode: 200,
		payload: undefined,
		status(code: number) {
			this.statusCode = code;
			return this;
		},
		json(payload: unknown) {
			this.payload = payload;
			return this;
		}
	};

	return res;
};

test('notFoundHandler responds with a 404 route error', () => {
	const req = { method: 'GET', originalUrl: '/missing-route' } as any;
	const res = createMockResponse();

	notFoundHandler(req, res, () => undefined);

	assert.equal(res.statusCode, 404);
	assert.deepEqual(res.payload, {
		message: 'Route GET /missing-route was not found.'
	});
});

test('errorHandler returns a 400 response for invalid JSON request bodies', () => {
	const req = {} as any;
	const res = createMockResponse();
	const error = { type: 'entity.parse.failed' } as any;

	errorHandler(error, req, res, () => undefined);

	assert.equal(res.statusCode, 400);
	assert.deepEqual(res.payload, {
		message: 'Request body contains invalid JSON.',
		errors: [{ field: 'body', message: 'Check the JSON syntax and try again.' }]
	});
});

test('errorHandler maps duplicate key errors to 409 responses', () => {
	const req = {} as any;
	const res = createMockResponse();
	const error = { code: '23505' } as any;

	errorHandler(error, req, res, () => undefined);

	assert.equal(res.statusCode, 409);
	assert.deepEqual(res.payload, {
		message: 'A record with those details already exists.'
	});
});

test('errorHandler maps custom 4xx errors to their message payloads', () => {
	const req = {} as any;
	const res = createMockResponse();
	const error = { statusCode: 422, message: 'The payload is invalid.' } as any;

	errorHandler(error, req, res, () => undefined);

	assert.equal(res.statusCode, 422);
	assert.deepEqual(res.payload, {
		message: 'The payload is invalid.'
	});
});

test('errorHandler returns a 500 response for unhandled server errors', () => {
	const req = {} as any;
	const res = createMockResponse();
	const originalError = console.error;
	let loggedError: unknown[] | undefined;
	console.error = (...args: unknown[]) => {
		loggedError = args;
	};

	try {
		errorHandler(new Error('Unhandled failure'), req, res, () => undefined);
	} finally {
		console.error = originalError;
	}

	assert.equal(res.statusCode, 500);
	assert.deepEqual(res.payload, {
		message: 'An unexpected server error occurred.'
	});
	assert.ok(loggedError);
	assert.equal(loggedError?.[0], 'Unhandled request error:');
});
