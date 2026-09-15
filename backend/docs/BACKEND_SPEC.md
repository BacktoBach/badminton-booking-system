# Badminton Class Booking System — Backend Specification

## 1. Trạng thái và quyết định đã chốt

Tài liệu này là nguồn sự thật cho giai đoạn backend. Nếu code, API contract hoặc database design thay đổi, phải cập nhật tài liệu trước hoặc trong cùng thay đổi.

- Trạng thái: **Phase 2 implemented locally — verification passed; ready for review and commit**.
- Phạm vi hiện tại: backend trước, mentor review xong mới triển khai frontend.
- Runtime: Node.js + TypeScript + Express 5.
- Database: PostgreSQL 17 local, quản lý bằng pgAdmin 4.
- Data access: package `pg`, raw parameterized SQL, không dùng Prisma hoặc ORM.
- Kiến trúc: layer-based MVC có service layer và model làm data-access layer.
- Authentication: JWT trong `httpOnly` cookie, không trả raw token cho frontend.
- Search, filter, sort và pagination phải query tại PostgreSQL trước khi trả dữ liệu.
- Test: Vitest + Supertest, có database test riêng.

Luồng chuẩn:

```text
Request
  → Route
  → Validation / Authentication / RBAC
  → Controller
  → Service
  → Model
  → PostgreSQL
```

Trong project này, `models/` là data-access layer dùng raw PostgreSQL. Model không phải ORM model và không được chứa business logic.

---

## 2. Mục tiêu sản phẩm

Ứng dụng quản lý và đăng ký lớp học cầu lông:

- Guest xem, tìm kiếm, lọc và xem chi tiết lớp sắp khai giảng.
- User đăng ký, hủy đăng ký và xem các lớp đã đăng ký.
- Admin tạo, sửa, xóa lớp và xem danh sách học viên.
- Không đăng ký trùng.
- Không đăng ký khi lớp đã đủ chỗ hoặc đã bắt đầu.
- Không xảy ra overbooking khi nhiều request đăng ký đồng thời.
- Mọi class response cần hiển thị số học viên hiện tại và số lượng tối đa.

### Ngoài phạm vi backend hiện tại

- Frontend React.
- Prisma hoặc ORM khác.
- OAuth/social login.
- Refresh token và session table.
- Forgot-password/email service.
- Payment, storage, realtime, queue hoặc cron.
- Swagger runtime nếu API contract Markdown đã đủ cho vòng review đầu.

---

## 3. Việc chủ project thực hiện trước khi giao model code

Hoàn thành tuần tự checklist này. Không bắt đầu feature backend khi chưa tạo được database development và test.

### 3.1. Kiểm tra phần mềm local

Máy hiện tại đã được xác minh có:

- Node.js 24.
- npm 11.
- PostgreSQL 17.
- Windows service `postgresql-x64-17` đang chạy.
- pgAdmin 4 nằm trong bộ cài PostgreSQL 17.
- `psql.exe` tại `C:\Program Files\PostgreSQL\17\bin\psql.exe`, nhưng chưa nằm trong `PATH`.

Nếu cần kiểm tra lại service:

```powershell
Get-Service -Name "postgresql*"
```

Kết quả mong đợi là `Running`.

### 3.2. Khởi tạo Git repository

Mở PowerShell tại `D:\badmintonbooking`:

```powershell
git init -b main
git status
```

Không tạo feature branch trước khi có baseline commit. Thứ tự đúng:

1. Khởi tạo root package và tài liệu.
2. Tạo `.gitignore`.
3. Commit baseline đầu tiên trên `main`.
4. Tạo branch `feat/backend-foundation`.
5. Model chỉ code trên branch feature.

### 3.3. Khởi tạo root npm project

Tại `D:\badmintonbooking`:

```powershell
npm init -y
```

Root `package.json` sau đó phải được model chỉnh thành private workspace:

```json
{
  "name": "badminton-booking-system",
  "private": true,
  "workspaces": [
    "backend"
  ]
}
```

Chưa thêm `frontend` vào workspace. Chỉ bổ sung sau khi backend được mentor duyệt.

### 3.4. Kết nối PostgreSQL trong pgAdmin

Backend kết nối tới PostgreSQL Server; pgAdmin chỉ là giao diện quản trị.

1. Mở `pgAdmin 4` từ Start Menu.
2. Nếu PostgreSQL local chưa xuất hiện, chọn `Register → Server`.
3. Tab General:
   - Name: `PostgreSQL Local 17`.
4. Tab Connection:
   - Host: `localhost`.
   - Port: `5432`.
   - Maintenance database: `postgres`.
   - Username: `postgres`.
   - Password: mật khẩu đã đặt khi cài PostgreSQL.
5. Save.

Không ghi mật khẩu PostgreSQL vào tài liệu hoặc commit Git.

### 3.5. Tạo role dành riêng cho ứng dụng

Trong pgAdmin:

1. Mở `Login/Group Roles`.
2. Chọn `Create → Login/Group Role`.
3. Name: `badminton_app_dev`.
4. Đặt password local riêng.
5. Bật `Can login`.
6. Giữ các quyền sau ở trạng thái tắt:
   - Superuser.
   - Create roles.
   - Create databases.
   - Replication.
7. Save.

Backend không được đăng nhập bằng superuser `postgres`.

### 3.6. Tạo database development và test

Trong `Databases → Create → Database` tạo:

```text
badminton_booking_dev
badminton_booking_test
```

Với cả hai database:

- Owner: `badminton_app_dev`.
- Encoding: `UTF8`.
- Không dùng database `postgres` để chứa table của ứng dụng.

Database test phải tách riêng vì integration test sẽ truncate dữ liệu giữa các test case.

### 3.7. Kiểm tra role và database

Mở Query Tool trên `badminton_booking_dev` và chạy:

```sql
SELECT current_database(), current_user, version();
```

Kết quả cần xác nhận:

- Database là `badminton_booking_dev`.
- PostgreSQL version 17.

Nếu Query Tool đang dùng user `postgres`, điều đó chỉ chứng minh pgAdmin kết nối được. Phase database sau đó vẫn phải kiểm tra `DATABASE_URL` bằng role `badminton_app_dev`.

### 3.8. Chuẩn bị thông tin `.env`

Không tự commit `.env`. Sau khi model tạo `.env.example`, copy thành `.env`:

```powershell
Copy-Item backend\.env.example backend\.env
```

Giá trị local dự kiến:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://badminton_app_dev:YOUR_LOCAL_PASSWORD@localhost:5432/badminton_booking_dev
DATABASE_SSL=false
JWT_SECRET=GENERATE_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
JWT_EXPIRES_IN=1d
CLIENT_ORIGINS=http://localhost:5173
TRUST_PROXY=false
```

Test dùng file/env riêng trỏ tới:

```env
DATABASE_URL=postgresql://badminton_app_dev:YOUR_LOCAL_PASSWORD@localhost:5432/badminton_booking_test
```

Nếu password có ký tự như `@`, `:`, `/`, `#` hoặc `%`, phải URL-encode phần password trong connection string.

### 3.9. Tạo baseline commit và feature branch

Sau khi root package, `.gitignore` và spec đã tồn tại:

```powershell
git add .
git commit -m "chore: initialize badminton booking project"
git switch -c feat/backend-foundation
git status
```

Ghi lại base commit trước khi model bắt đầu code:

```powershell
git rev-parse HEAD
```

### 3.10. Điều kiện sẵn sàng giao Phase 0

- [ ] Git repository đã có nhánh `main` và baseline commit.
- [ ] Đang đứng ở `feat/backend-foundation`.
- [ ] PostgreSQL service đang chạy.
- [ ] Role `badminton_app_dev` tồn tại và không phải superuser.
- [ ] `badminton_booking_dev` tồn tại.
- [ ] `badminton_booking_test` tồn tại.
- [ ] Chủ project biết password local nhưng password không nằm trong Git.
- [ ] Root `package.json` tồn tại.
- [ ] `backend/docs/BACKEND_SPEC.md` được commit.

---

## 4. Cấu trúc folder đã chốt

Đây là target structure. Không tạo sẵn folder hoặc file rỗng; mỗi phase chỉ tạo thành phần có code hoặc tài liệu thật.

```text
badmintonbooking/
├─ backend/
│  ├─ database/
│  │  ├─ migrations/
│  │  │  └─ 001_initial_schema.sql
│  │  └─ seeds/
│  │     └─ development.seed.ts
│  ├─ docs/
│  │  ├─ BACKEND_SPEC.md
│  │  └─ API_CONTRACT.md
│  ├─ scripts/
│  │  ├─ migrate.ts
│  │  ├─ seed.ts
│  │  └─ check-database.ts
│  ├─ src/
│  │  ├─ config/
│  │  │  ├─ env.ts
│  │  │  ├─ cors.ts
│  │  │  └─ auth-cookie.ts
│  │  ├─ controllers/
│  │  │  ├─ auth.controller.ts
│  │  │  ├─ class.controller.ts
│  │  │  ├─ enrollment.controller.ts
│  │  │  └─ health.controller.ts
│  │  ├─ database/
│  │  │  ├─ pool.ts
│  │  │  ├─ transaction.ts
│  │  │  └─ postgres-error.ts
│  │  ├─ errors/
│  │  │  ├─ app-error.ts
│  │  │  └─ error-codes.ts
│  │  ├─ middlewares/
│  │  │  ├─ authenticate.ts
│  │  │  ├─ authorize.ts
│  │  │  ├─ validate-origin.ts
│  │  │  ├─ validate.ts
│  │  │  ├─ rate-limit.ts
│  │  │  ├─ not-found.ts
│  │  │  └─ error-handler.ts
│  │  ├─ models/
│  │  │  ├─ user.model.ts
│  │  │  ├─ class.model.ts
│  │  │  └─ enrollment.model.ts
│  │  ├─ routes/
│  │  │  ├─ auth.routes.ts
│  │  │  ├─ class.routes.ts
│  │  │  ├─ enrollment.routes.ts
│  │  │  ├─ admin.routes.ts
│  │  │  ├─ health.routes.ts
│  │  │  └─ index.ts
│  │  ├─ schemas/
│  │  │  ├─ auth.schema.ts
│  │  │  ├─ class.schema.ts
│  │  │  ├─ enrollment.schema.ts
│  │  │  └─ common.schema.ts
│  │  ├─ services/
│  │  │  ├─ auth.service.ts
│  │  │  ├─ class.service.ts
│  │  │  └─ enrollment.service.ts
│  │  ├─ types/
│  │  │  ├─ auth.ts
│  │  │  ├─ class.ts
│  │  │  ├─ enrollment.ts
│  │  │  ├─ pagination.ts
│  │  │  └─ express.d.ts
│  │  ├─ utils/
│  │  │  ├─ jwt.ts
│  │  │  ├─ password.ts
│  │  │  ├─ pagination.ts
│  │  │  ├─ response.ts
│  │  │  └─ user-serializer.ts
│  │  ├─ app.ts
│  │  └─ server.ts
│  ├─ tests/
│  │  ├─ helpers/
│  │  │  ├─ test-database.ts
│  │  │  └─ test-data.ts
│  │  ├─ unit/
│  │  └─ integration/
│  ├─ .env.example
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ vitest.config.ts
├─ .editorconfig
├─ .gitignore
├─ package.json
├─ package-lock.json
└─ README.md
```

Không tạo trong backend phase đầu:

- `frontend/`.
- `modules/`.
- `shared/`.
- `repositories/`.
- `generated/`.
- `integrations/`.
- `application.ts`.
- `lifecycle.ts`.
- `health.service.ts`.

---

## 5. Quy tắc phân tầng

### Routes

- Khai báo method và URL.
- Gắn validation, authentication và authorization middleware.
- Gọi controller.
- Không chứa SQL hoặc business rules.

### Controllers

- Đọc dữ liệu đã validate từ request.
- Gọi service.
- Chọn status code và trả response.
- Không truy cập model hoặc database trực tiếp, ngoại trừ health controller gọi database health helper.

### Services

- Chứa business rules.
- Điều phối model.
- Mở transaction cho use case atomic.
- Chuyển database conflict thành application error.
- Không phụ thuộc Express `Request` hoặc `Response`.

### Models

- Là data-access layer cho raw PostgreSQL.
- Chứa parameterized SQL.
- Nhận `Pool` hoặc `PoolClient` thông qua kiểu query client dùng chung.
- Trả row/result có TypeScript type rõ ràng.
- Không quyết định HTTP status hoặc message.
- Không chứa JWT, cookie, RBAC hoặc business policy.

### Schemas

- Zod schema cho body, params và query.
- Validation chạy trước controller.
- Search và pagination input phải có giới hạn.

### Database runtime

- `pool.ts`: connection pool và health helper.
- `transaction.ts`: `BEGIN`, `COMMIT`, `ROLLBACK`, luôn release client.
- `postgres-error.ts`: nhận diện SQLSTATE và constraint name.

### app.ts và server.ts

`app.ts` chỉ ghép HTTP pipeline và export Express app. Không gọi `listen()`.

```text
helmet
→ cors
→ express.json
→ cookieParser
→ routes
→ notFound
→ errorHandler
```

`server.ts`:

- Validate env.
- Kiểm tra database lúc startup.
- Gọi `listen()`.
- Xử lý `SIGINT` và `SIGTERM`.
- Ngừng nhận request và đóng pool.
- Xử lý fatal startup error.

---

## 6. Database design

### users

```text
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            VARCHAR(100) NOT NULL
email           VARCHAR(255) NOT NULL
password_hash   VARCHAR(255) NOT NULL
role            VARCHAR(20) NOT NULL DEFAULT 'user'
token_version   INTEGER NOT NULL DEFAULT 0
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

Constraints:

- `role IN ('admin', 'user')`.
- `token_version >= 0`.
- Unique index trên `LOWER(email)`.
- Backend trim và lowercase email trước khi insert/query.
- Public registration luôn tạo `user`, không nhận role từ body.

### classes

```text
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
title           VARCHAR(150) NOT NULL
description     TEXT NOT NULL
coach_name      VARCHAR(100) NOT NULL
level           VARCHAR(20) NOT NULL
start_date      TIMESTAMPTZ NOT NULL
schedule        VARCHAR(255) NOT NULL
location        VARCHAR(255) NOT NULL
max_students    INTEGER NOT NULL
created_by_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

Constraints:

- `level IN ('beginner', 'intermediate', 'advanced')`.
- `max_students BETWEEN 1 AND 500`.

### enrollments

```text
class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE
user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
PRIMARY KEY (class_id, user_id)
```

Indexes:

- Unique `LOWER(users.email)`.
- `classes(start_date)`.
- `classes(level, start_date)`.
- `classes(created_by_id)`.
- Trigram GIN index cho class title.
- `enrollments(user_id, enrolled_at)`.

`001_initial_schema.sql` chứa extensions, tables, constraints, indexes, functions và triggers của baseline. Không chia baseline thành nhiều migration chỉ để phân loại SQL.

---

## 7. Business rules và concurrency

- Composite primary key chặn duplicate enrollment.
- Không enroll nếu class không tồn tại.
- Không enroll nếu `start_date <= NOW()`.
- Không enroll nếu current count đã bằng `max_students`.
- Không giảm `max_students` thấp hơn enrollment count hiện tại.
- Mọi class DTO có `currentStudents`, `maxStudents`, `availableSlots`, `isFull`.

Luồng enrollment bắt buộc:

```text
BEGIN
  → SELECT class WHERE id = $1 FOR UPDATE
  → kiểm tra class tồn tại
  → kiểm tra class chưa bắt đầu
  → kiểm tra duplicate enrollment
  → đếm enrollment hiện tại
  → kiểm tra capacity
  → INSERT enrollment
COMMIT
```

Service kiểm tra để trả lỗi thân thiện; constraint/trigger PostgreSQL là lớp bảo vệ cuối. Phải có integration test chạy nhiều enrollment request đồng thời và xác nhận số bản ghi không vượt capacity.

---

## 8. Authentication và security

- JWT chỉ nằm trong `httpOnly` cookie.
- Login response không trả token.
- JWT chứa `sub` và `tokenVersion`, không cần chứa role/email/name.
- Protected request verify JWT rồi đọc user mới nhất từ PostgreSQL.
- RBAC dùng role trong database.
- Đổi password tăng `token_version` và clear cookie.
- Logout public và luôn clear cookie.
- Password được giới hạn theo bcrypt: tối đa 72 byte UTF-8.
- Register/login có rate limit.
- JSON body giới hạn 10 KB.
- Dùng Helmet, tắt `x-powered-by`.
- Unsafe request phải kiểm tra Origin allowlist.
- Không dùng wildcard CORS với credential.

Cookie development:

```text
auth_session; HttpOnly; SameSite=Lax; Path=/; Secure=false
```

Cookie production qua frontend same-origin proxy:

```text
__Host-auth_session; HttpOnly; SameSite=Lax; Path=/; Secure=true
```

Production dự kiến:

```text
Browser
  → Vercel frontend /api/*
  → Vercel rewrite
  → Render backend /api/*
```

---

## 9. API scope

### Auth

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
PUT  /api/auth/change-password
```

### Public classes

```text
GET /api/classes?page=1&limit=9&search=...&level=beginner
GET /api/classes/:classId
```

Public list chỉ lấy class có `start_date > NOW()`. Search/filter chạy tại database trước pagination. Sort ổn định bằng `start_date ASC, id ASC`.

### Admin

```text
GET    /api/admin/classes
POST   /api/classes
PATCH  /api/classes/:classId
DELETE /api/classes/:classId
GET    /api/classes/:classId/students?page=1&limit=20&search=...
```

`created_by_id` luôn lấy từ authenticated admin, không lấy từ request body.

### Enrollment

```text
POST   /api/classes/:classId/enrollments
DELETE /api/classes/:classId/enrollments
GET    /api/enrollments/me?page=1&limit=10&status=upcoming
```

User enrollment endpoints chỉ dành cho role `user` trong scope hiện tại.

API body, response và error examples chi tiết được viết trong `backend/docs/API_CONTRACT.md` ở phase API contract.

---

## 10. Error contract

```json
{
  "error": {
    "code": "CLASS_FULL",
    "message": "Lớp học đã đủ số lượng học viên"
  }
}
```

Validation error có thể thêm `fields`.

Error code tối thiểu:

```text
VALIDATION_ERROR
EMAIL_ALREADY_EXISTS
INVALID_CREDENTIALS
AUTH_REQUIRED
INVALID_TOKEN
TOKEN_REVOKED
FORBIDDEN
TOO_MANY_REQUESTS
CLASS_NOT_FOUND
CLASS_ALREADY_STARTED
CAPACITY_BELOW_CURRENT_ENROLLMENTS
ALREADY_ENROLLED
CLASS_FULL
ENROLLMENT_NOT_FOUND
ROUTE_NOT_FOUND
MALFORMED_JSON
PAYLOAD_TOO_LARGE
DATABASE_UNAVAILABLE
INTERNAL_SERVER_ERROR
```

Không trả SQLSTATE, constraint name, database connection string hoặc stack trace cho client.

---

## 11. Migration và seed

Migration runner phải:

1. Kết nối bằng `DATABASE_URL`.
2. Lấy PostgreSQL advisory lock.
3. Tạo bảng `schema_migrations` nếu chưa có.
4. Đọc SQL migration theo filename tăng dần.
5. Lưu checksum.
6. Không chạy lại migration đã hoàn thành.
7. Từ chối checksum drift nếu file cũ bị sửa.
8. Chạy migration trong transaction.
9. Rollback khi lỗi.
10. Release client và đóng pool.

Không sửa migration đã chạy; tạo migration mới cho thay đổi schema.

Seed development:

- Idempotent.
- Không hardcode credential thật.
- Admin email/password lấy từ environment.
- Refuse chạy production nếu không có opt-in rõ ràng.
- Không tự seed production trong deploy command.

---

## 12. Implementation phases

### Phase 0 — Backend foundation

Implementation status on 2026-09-15:

- Source scaffold complete on `feat/backend-foundation`.
- Typecheck passed.
- Production build passed.
- Database check passed with `badminton_app_dev` against PostgreSQL 17.10.
- Seven foundation integration tests passed.
- Live HTTP smoke tests passed for health, CORS, 404, malformed JSON and payload limit.
- Root `.env` was removed from the only local baseline commit and the obsolete commit object was pruned before any remote was configured.

- Root workspace scripts.
- Backend package và TypeScript config.
- Express app/server.
- Environment validation.
- PostgreSQL pool.
- Health route.
- Global error pipeline.
- `.env.example` và README setup.

Pass criteria:

```text
npm install
npm run typecheck --workspace backend
npm run build --workspace backend
npm run db:check --workspace backend
GET /api/health → 200 khi database connected
```

### Phase 1 — Database baseline

Implementation status on 2026-09-15:

- Implemented on `feat/database-baseline` from merge commit `0699d05ef4e7b6d0dc572b95b57f9f8c2e477324`.
- Migration runner uses an advisory lock, SHA-256 checksums, per-migration transactions and drift detection.
- Development and test databases migrated successfully from an empty public schema.
- A second migration run reported the schema as up to date.
- Development seed completed twice with one admin and three classes, without duplicate rows.
- Database-level duplicate, started-class, capacity-update and concurrent-overbooking protections passed integration tests.
- Test cleanup guard refused the development database as expected.

- Migration runner.
- Initial schema.
- Constraints/indexes/triggers.
- Development seed.
- Test database guard.

Pass criteria:

- Migration chạy từ database trống.
- Chạy migration lần hai không lỗi.
- Seed chạy hai lần không duplicate.
- Tables/constraints/triggers xuất hiện trong pgAdmin.

### Phase 2 — Authentication

Implementation status on 2026-09-15:

- Implemented on `feat/authentication` from Phase 1 merge commit `c4fcbd293fc1642c03a48a82b42f623cba13cd48`.
- JWT is stored only in an HTTP-only cookie and is never returned in JSON.
- Protected requests verify HS256, reload the current database user and compare `token_version`.
- Password changes use a conditional update, increment `token_version` and clear the cookie.
- Registration cannot assign an admin role; duplicate email conflicts are mapped from PostgreSQL.
- Unsafe browser origins are rejected and auth endpoints have dedicated rate limits.
- Unit/integration tests cover validation, cookie flags, JWT, auth flow, revocation and latest-role RBAC.
- A production Node ESM start and live dev-database login/me/logout smoke test passed.

- Register, login, logout, me, change-password.
- Cookie/JWT/token version.
- Authentication/RBAC middleware.
- Origin validation và rate limit.
- Unit/integration tests auth.

### Phase 3 — Public classes

- Implementation status: completed on `feat/public-classes` from Phase 2 merge commit `16ad1ce48f4b17cbfbb6938945996a5d13457d00`.
- Public list uses database-side search/filter/counting before pagination and stable `start_date ASC, id ASC` ordering.
- Search treats `%`, `_` and `\\` as literal user input instead of SQL wildcard syntax.
- Public DTO exposes `currentStudents`, `maxStudents`, `availableSlots` and `isFull` without internal ownership fields.
- Query/path validation covers pagination bounds, supported levels, unknown query keys and UUID class IDs.
- PostgreSQL integration tests cover upcoming-only visibility, filtered pagination, literal search, capacity fields, detail and errors.
- API response examples are documented in `backend/docs/API_CONTRACT.md`.

- Upcoming list.
- Search, filter, pagination.
- Detail.
- Student counts và capacity fields.

### Phase 4 — Admin classes

- Admin list.
- Create, update, delete.
- Student list search/pagination.
- Capacity reduction protection.

### Phase 5 — Enrollment

- Enroll/cancel/my classes.
- Row locking và transaction.
- Duplicate/full/past-class errors.
- Concurrency test.

### Phase 6 — Backend hardening và mentor handoff

- Full tests và coverage report.
- API contract.
- README hoàn thiện.
- Secret scan.
- Migration-from-empty verification.
- Production build.
- Mentor checklist.

Không bắt đầu frontend trước khi Phase 6 được duyệt.

---

## 13. Test requirements

Unit:

- Env validation.
- Cookie options.
- JWT sign/verify.
- Password byte limit.
- Pagination parsing.
- PostgreSQL error mapping.
- Origin allowlist.

Integration với `badminton_booking_test`:

- Auth cookie flow.
- Token revocation.
- RBAC.
- Class CRUD.
- Search/filter/pagination.
- Enrollment/cancel.
- Duplicate enrollment.
- Full class.
- Past class.
- Capacity reduction.
- Cascading delete.
- Concurrent enrollment.
- Malformed JSON và payload limit.

Test helper chỉ được cleanup database có tên kết thúc bằng `_test`. Nếu không đúng tên, test phải dừng ngay thay vì truncate.

---

## 14. Backend Definition of Done

- [ ] Typecheck pass.
- [ ] Production build pass.
- [ ] Unit và integration tests pass.
- [ ] Migration chạy được từ database trống.
- [ ] Migration rerun an toàn.
- [ ] Seed idempotent.
- [ ] JWT không xuất hiện trong response hoặc Web Storage contract.
- [ ] Public register không tạo được admin.
- [ ] RBAC enforce ở backend.
- [ ] Search/filter/pagination chạy trong PostgreSQL.
- [ ] Duplicate enrollment bị chặn.
- [ ] Concurrency test chứng minh không overbook.
- [ ] Không giảm capacity dưới enrollment count.
- [ ] Student list chính xác.
- [ ] Error response nhất quán.
- [ ] CORS, cookie và Origin validation đúng.
- [ ] Không có secret trong repository.
- [ ] Mentor có thể clone và chạy từ database trống bằng README.

---

## 15. Prompt chuẩn giao cho model thấp hơn

```text
Chỉ triển khai đúng Phase N trong backend/docs/BACKEND_SPEC.md.

Yêu cầu:
1. Đọc toàn bộ spec và các file thuộc phase trước khi sửa.
2. Báo base branch/base commit và danh sách file dự kiến thay đổi.
3. Không triển khai phase kế tiếp.
4. Không thêm Prisma, ORM hoặc đổi kiến trúc đã chốt.
5. Giữ luồng Route → Controller → Service → Model → PostgreSQL.
6. Models chỉ chứa parameterized SQL; services chứa business rules và transaction.
7. Không hardcode secret, admin password hoặc connection string thật.
8. Không bỏ hoặc nới test chỉ để build pass.
9. Chạy typecheck, test liên quan và build sau khi sửa.
10. Báo rõ command đã chạy, kết quả pass/fail và phần chưa được xác minh.
```
