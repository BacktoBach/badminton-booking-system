# Badminton Class Booking System

Backend-first full-stack training project for managing badminton classes and enrollments.

The approved backend architecture and implementation phases are documented in
[`backend/docs/BACKEND_SPEC.md`](backend/docs/BACKEND_SPEC.md).

## Current scope

- Backend: Node.js, TypeScript, Express and PostgreSQL using raw parameterized SQL.
- Authentication: JWT stored only in an HTTP-only cookie.
- Frontend: deferred until the backend passes mentor review.

## Local foundation

```powershell
npm install
npm run db:check
npm run typecheck:server
npm run build:server
npm run dev:server
```

The health endpoint is `http://localhost:4000/api/health`.
