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
npm run db:migrate
npm run db:seed
npm run typecheck:server
npm run build:server
npm run dev:server
```

The health endpoint is `http://localhost:4000/api/health`.

Authentication endpoints are available under `/api/auth`: register, login, logout, `me` and
change-password. Login stores the JWT only in an HTTP-only cookie; the token is not returned in JSON.

`db:migrate` is safe to rerun: applied migrations are tracked with checksums. The development seed is
idempotent and reads its admin account values from the ignored `backend/.env` file.

Integration tests use `TEST_DATABASE_URL` and refuse destructive cleanup unless PostgreSQL confirms
that the connected database name ends with `_test`.
