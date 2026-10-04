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

