# Badminton Class Booking System

Backend-first application for managing badminton classes and enrollments. The backend uses Node.js,
TypeScript, Express 5 and PostgreSQL with raw parameterized SQL—no ORM.

## Features

- HTTP-only cookie authentication with JWT revocation through `token_version`.
- Current-database-role authorization for `admin` and `user`.
- Public upcoming-class search, level filter, stable sorting and pagination.
- Admin class CRUD and searchable student lists.
- User enrollment, cancellation and personal class history.
- Transactional row locking plus database triggers to prevent overbooking.
- Consistent validation and error envelopes.

Detailed request/response examples are in
[`backend/docs/API_CONTRACT.md`](backend/docs/API_CONTRACT.md). Architecture and implementation
decisions are in [`backend/docs/BACKEND_SPEC.md`](backend/docs/BACKEND_SPEC.md).

## Requirements

- Node.js 20 or newer.
- npm 10 or newer.
- PostgreSQL 17.
- Two local databases: one for development and one isolated test database.

## Project structure

```text
backend/
├─ database/       SQL migrations and development seed source
├─ docs/           API contract and backend specification
├─ scripts/        migration, seed and database connectivity commands
├─ src/
│  ├─ config/      validated environment, CORS and cookie options
│  ├─ controllers/ HTTP input/output
│  ├─ database/    pool, transaction and PostgreSQL error helpers
│  ├─ middlewares/ authentication, RBAC, validation and error pipeline
│  ├─ models/      parameterized SQL data-access layer
│  ├─ routes/      endpoint definitions and middleware composition
│  ├─ schemas/     Zod request schemas
│  ├─ services/    business rules and transaction orchestration
│  ├─ types/       cross-layer TypeScript types
│  └─ utils/       pure technical helpers and serializers
└─ tests/          unit and PostgreSQL integration tests
```

```text
Route → validation/auth/RBAC → Controller → Service → Model → PostgreSQL
```

## PostgreSQL setup with pgAdmin

Connect to your local server as a superuser, open Query Tool on the `postgres` database, replace the
example password and run:

```sql
CREATE ROLE badminton_app_dev WITH LOGIN PASSWORD 'choose-a-local-password';
CREATE DATABASE badminton_booking_dev OWNER badminton_app_dev;
CREATE DATABASE badminton_booking_test OWNER badminton_app_dev;
```

Do not reuse a real or production password. Tests destructively recreate the `public` schema and
refuse to do so unless PostgreSQL reports a database name ending in `_test`.

## Environment configuration

```powershell
Copy-Item backend/.env.example backend/.env
```

Set the local values:

```dotenv
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://badminton_app_dev:YOUR_PASSWORD@localhost:5432/badminton_booking_dev
TEST_DATABASE_URL=postgresql://badminton_app_dev:YOUR_PASSWORD@localhost:5432/badminton_booking_test
DATABASE_SSL=false
JWT_SECRET=GENERATE_AT_LEAST_32_RANDOM_CHARACTERS
JWT_EXPIRES_IN=1d
CLIENT_ORIGINS=http://localhost:5173
TRUST_PROXY=false
SEED_ADMIN_NAME=Local Admin
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=CHOOSE_A_LOCAL_PASSWORD
```

`backend/.env` is ignored by Git. Never commit database credentials, JWT secrets or seed passwords.

## Install and run

```powershell
npm install
npm run db:check
npm run db:migrate
npm run db:seed
npm run dev:server
```

The API listens on `http://localhost:4000`; health endpoint: `GET /api/health`.

Migration reruns are safe: applied filenames and SHA-256 checksums are tracked in
`schema_migrations`. The development seed is idempotent and blocked in production.

## API overview

Authentication:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/change-password`

Public classes:

- `GET /api/classes?page=1&limit=9&search=...&level=beginner`
- `GET /api/classes/:classId`

Admin-only class management:

- `GET /api/admin/classes`
- `POST /api/classes`
- `PATCH /api/classes/:classId`
- `DELETE /api/classes/:classId`
- `GET /api/classes/:classId/students`

User-only enrollments:

- `POST /api/classes/:classId/enrollments`
- `DELETE /api/classes/:classId/enrollments`
- `GET /api/enrollments/me?page=1&limit=10&status=upcoming`

Login stores JWT only in an HTTP-only cookie. API consumers send credentials/cookies; the backend
does not return a raw token for browser storage.

## Tests and verification

```powershell
npm run typecheck:server
npm run test:server
npm run test:coverage
npm run build:server
npm run db:check
```

Coverage output is written to ignored `backend/coverage/`. Integration tests use the isolated test
database and cover authentication, RBAC, CRUD, search/filter/pagination, database constraints and
concurrent enrollment.

Run the compiled application:

```powershell
npm run build:server
npm run start --workspace backend
```

## Security boundaries

- SQL values are parameterized; dynamic update columns use a fixed allowlist.
- Unsafe browser requests validate `Origin` against `CLIENT_ORIGINS`.
- Credentialed CORS never uses a wildcard origin.
- Production cookies use the `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax` and path `/`.
- JSON bodies are limited to 10 KB and authentication endpoints are rate-limited.
- Production errors do not expose stack traces or PostgreSQL details.
- Enrollment capacity is protected by transactions, row locks and database triggers.

The frontend remains outside the workspace until backend verification is complete.
