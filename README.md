# Collaborative Code Review Platform

A backend API for a collaborative code review platform built with Node.js, TypeScript, Express, and PostgreSQL. The service supports authentication, project management, repository handling, user management, comments, and code submissions.

## Features

- User authentication and authorization
- Project creation and management
- Repository tracking and metadata handling
- User profile and account management
- Review comments and discussion flows
- Submission handling for review workflows
- PostgreSQL-backed persistence

## Tech Stack

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- JWT for authentication
- bcrypt for password hashing
- dotenv for environment configuration

## Project Structure

```text
src/
├── config/
├── controllers/
├── middleware/
├── routes/
├── services/
├── types/
├── server.ts
```

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL database

## Setup

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root with the following values:

```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/collab_review
JWT_SECRET=your_jwt_secret_here
```

4. Start the development server:

```bash
npm run dev
```

The API will run at:

```text
http://localhost:5000
```

## Available Scripts

```bash
npm run dev   # runs the server with nodemon
npm run build # compiles TypeScript
npm start     # starts the project using tsx
```

## API Overview

The application exposes the following route groups:

- `/api/auth` - authentication and user login flows
- `/api/projects` - project operations
- `/api/users` - user management
- `/api/repositories` - repository endpoints
- `/api/comments` - review comments
- `/api/submissions` - code submissions and review-related payloads

### Project statistics

`GET /api/projects/:id/stats` returns average time to first review (in hours), approved and changes-requested/rejected percentages based on recorded review decisions, activity per reviewer, and the most-commented submission. Review-time and percentage fields are `null` when no matching review records exist; `reviewer_activity` is an empty array and `most_commented_submission` is `null` when there is no matching data.

### Reviewer assignment

An authenticated Admin can assign or revoke the Reviewer role for a user:

```http
PATCH /api/users/:id/role
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "role": "Reviewer" }
```

Only `Reviewer` and `Submitter` can be selected; registration always creates Submitter accounts. The affected user must log in again to receive a token containing their updated role.

### Submission comments

- `POST /api/submissions/:id/comments` adds a comment as the authenticated user.
- `GET /api/submissions/:id/comments` lists comments, including each author's name and role.
- `PUT /api/comments/:id` updates a comment.
- `DELETE /api/comments/:id` deletes a comment.

Submitters, Reviewers, and Admins can add or list comments. Only the comment's author or an Admin can update or delete it.

### Review workflow

- `PATCH /api/submissions/:id/approve` approves a submission and records an `approved` review.
- `PATCH /api/submissions/:id/request-changes` requests changes and records a `changes_requested` review. An optional `comment` can explain the requested changes.
- `GET /api/submissions/:id/reviews` returns review history in chronological order, including reviewer name and role.

Review decisions are available to Reviewers, Admins, and the project owner. Use these decision endpoints rather than the generic status endpoint so each decision is recorded in the review history.

### Notifications

- `GET /api/users/:id/notifications` lists the authenticated user's notifications; Admins can also view another user's notifications.
- A new comment or review decision creates a notification for the submission's submitter. The acting user does not receive a notification for their own action.

The same notifications are pushed live over WebSocket at `/ws`. Connect, then send the first message as JSON:

```json
{ "type": "authenticate", "token": "<your JWT>" }
```

After receiving `{ "type": "authenticated" }`, listen for messages shaped like:

```json
{ "type": "notification", "notification": { "id": 1, "user_id": 2, "type": "comment", "message": "A new comment was added to your submission #3.", "read": false, "created_at": "..." } }
```

Connections must authenticate within 10 seconds. Notification events are delivered only to connected sockets belonging to the notification recipient.

## Health Check

A basic test route is available:

```http
GET /test
```

Example response:

```json
{
  "message": "Test route works"
}
```

## Notes

- The server initializes a database connection on startup.
- Error handling and route fallback middleware are already configured.
- This project is structured as a backend API foundation and can be expanded with frontend integration, validation layers, and full review workflows.
