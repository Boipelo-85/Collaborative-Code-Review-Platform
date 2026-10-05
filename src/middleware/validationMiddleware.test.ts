import assert from 'node:assert/strict';
import test from 'node:test';

import { validateBody, validateIdParam, validationRules } from './validationMiddleware.js';

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

test('validateBody rejects non-object request bodies', () => {
	const req = { body: 'not-json' } as any;
	const res = createMockResponse();
	let nextCalled = false;

	validateBody({ email: { required: true, validate: validationRules.email } })(req, res, () => {
		nextCalled = true;
	});

	assert.equal(res.statusCode, 400);
	assert.deepEqual(res.payload, {
		message: 'Request body must be a JSON object.',
		errors: [{ field: 'body', message: 'A JSON object is required.' }]
	});
	assert.equal(nextCalled, false);
});

test('validateBody returns validation errors for required fields', () => {
	const req = { body: { email: 'invalid-email' } } as any;
	const res = createMockResponse();
	let nextCalled = false;

	validateBody({
		email: { required: true, validate: validationRules.email },
		name: { required: true, validate: validationRules.nonEmptyString('name') }
	})(req, res, () => {
		nextCalled = true;
	});

	assert.equal(res.statusCode, 400);
	assert.deepEqual(res.payload, {
		message: 'Validation failed.',
		errors: [
			{ field: 'email', message: 'email must be a valid email address.' },
			{ field: 'name', message: 'name is required.' }
		]
	});
	assert.equal(nextCalled, false);
});

test('validateBody calls next for valid payloads', () => {
	const req = { body: { email: 'user@example.com', name: 'User' } } as any;
	const res = createMockResponse();
	let nextCalled = false;

	validateBody({
		email: { required: true, validate: validationRules.email },
		name: { required: true, validate: validationRules.nonEmptyString('name') }
	})(req, res, () => {
		nextCalled = true;
	});

	assert.equal(res.statusCode, 200);
	assert.equal(nextCalled, true);
});

test('validateBody enforces atLeastOne field for updates', () => {
	const req = { body: { title: 'A title' } } as any;
	const res = createMockResponse();
	let nextCalled = false;

	validateBody(
		{
			title: { validate: validationRules.nonEmptyString('title') }
		},
		{ atLeastOne: ['description', 'status'] }
	)(req, res, () => {
		nextCalled = true;
	});

	assert.equal(res.statusCode, 400);
	assert.deepEqual(res.payload, {
		message: 'Validation failed.',
		errors: [{ field: 'body', message: 'Provide at least one field to update: description, status.' }]
	});
	assert.equal(nextCalled, false);
});

test('validateIdParam rejects non-positive integers', () => {
	const req = { params: { id: '0' } } as any;
	const res = createMockResponse();
	let nextCalled = false;

	validateIdParam()(req, res, () => {
		nextCalled = true;
	});

	assert.equal(res.statusCode, 400);
	assert.deepEqual(res.payload, {
		message: 'Validation failed.',
		errors: [{ field: 'id', message: 'id must be a positive integer.' }]
	});
	assert.equal(nextCalled, false);
});

test('validateIdParam passes valid positive integer ids', () => {
	const req = { params: { id: '42' } } as any;
	const res = createMockResponse();
	let nextCalled = false;

	validateIdParam()(req, res, () => {
		nextCalled = true;
	});

	assert.equal(res.statusCode, 200);
	assert.equal(nextCalled, true);
});

test('validationRules validates emails and nullable fields', () => {
	assert.equal(validationRules.email('user@example.com'), null);
	assert.equal(validationRules.email('not-an-email'), 'email must be a valid email address.');
	assert.equal(validationRules.nullableString('subscription')('active'), null);
	assert.equal(validationRules.nullableString('subscription')(null), null);
	assert.equal(validationRules.nullableString('subscription')(42), 'subscription must be a string or null.');
	assert.equal(validationRules.integerOrNull('count')(7), null);
	assert.equal(validationRules.integerOrNull('count')(null), null);
	assert.equal(validationRules.integerOrNull('count')('7'), 'count must be an integer or null.');
});
