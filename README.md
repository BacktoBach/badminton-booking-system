# Badminton Class Booking System

Backend quản lý lớp học cầu lông, được xây dựng bằng Node.js, TypeScript, Express 5 và PostgreSQL với raw parameterized SQL, không sử dụng ORM.

## Liên kết

| Môi trường | URL |
| --- | --- |
| Backend production | https://badminton-booking-system-0xi7.onrender.com |
| Health check | https://badminton-booking-system-0xi7.onrender.com/api/health |
| Repository | https://github.com/BacktoBach/badminton-booking-system |

Production đã được kiểm tra với Render PostgreSQL: health check, public class list và Postman authentication đều hoạt động.

## Tài khoản kiểm thử quản trị

| Role | Email | Mật khẩu |
| --- | --- | --- |
| `admin` | `testdb@example.com` | Cung cấp riêng cho người kiểm thử, không lưu trong Git |

Đây là tài khoản tạm thời. Phải đổi mật khẩu hoặc xóa tài khoản sau khi kết thúc đợt kiểm thử. Không thêm mật khẩu thật vào README, issue, commit, ảnh chụp màn hình hoặc Postman collection được public.

## Chức năng chính

- Authentication bằng JWT trong HTTP-only cookie.
- Đổi mật khẩu làm mất hiệu lực toàn bộ token cũ thông qua `token_version`.
- RBAC sử dụng role mới nhất đọc từ PostgreSQL.
- Guest xem, tìm kiếm và lọc các lớp sắp khai giảng.
- Admin tạo, sửa, xóa lớp và xem danh sách học viên.
- User đăng ký, hủy đăng ký và xem các lớp đã đăng ký.
- Transaction, row lock và database trigger chống overbooking.
- Search/filter chạy trong PostgreSQL trước pagination.
- Error response và validation thống nhất.

## Kiến trúc

```text
Route
→ Validation / Authentication / RBAC
→ Controller
→ Service
→ Model
→ PostgreSQL
```

Trong project này, `models/` là data-access layer chứa raw parameterized SQL, không phải ORM model.

```text
backend/
├─ database/       Migration và development seed
├─ docs/           API contract và backend specification
├─ scripts/        Migrate, seed và database check
├─ src/
│  ├─ config/      Environment, CORS và cookie
│  ├─ controllers/ HTTP input/output
│  ├─ database/    Pool, transaction và PostgreSQL error helper
│  ├─ errors/      AppError và error code
│  ├─ middlewares/ Authentication, RBAC, validation và error pipeline
│  ├─ models/      Data-access layer
│  ├─ routes/      Khai báo endpoint
│  ├─ schemas/     Zod request schema
│  ├─ services/    Business rules và transaction orchestration
│  ├─ types/       Type dùng qua nhiều layer
│  └─ utils/       Pure helper và serializer
└─ tests/          Unit test và PostgreSQL integration test
```

## API endpoints

### Health và authentication

| Method | Endpoint | Quyền | Mô tả | Thành công |
| --- | --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Kiểm tra API và PostgreSQL | `200` |
| `POST` | `/api/auth/register` | Public | Đăng ký tài khoản role `user` | `201` |
| `POST` | `/api/auth/login` | Public | Login và set HTTP-only cookie | `200` |
| `POST` | `/api/auth/logout` | Public | Clear authentication cookie | `200` |
| `GET` | `/api/auth/me` | Đã login | Lấy user và thời điểm hết hạn session | `200` |
| `PUT` | `/api/auth/change-password` | Đã login | Đổi mật khẩu và revoke token cũ | `200` |

### Classes

| Method | Endpoint | Quyền | Mô tả | Thành công |
| --- | --- | --- | --- | --- |
| `GET` | `/api/classes` | Public | Upcoming classes, search, level filter, pagination | `200` |
| `GET` | `/api/classes/:classId` | Public | Chi tiết lớp và capacity hiện tại | `200` |
| `GET` | `/api/admin/classes` | Admin | Danh sách tất cả lớp, gồm cả lớp đã bắt đầu | `200` |
| `POST` | `/api/classes` | Admin | Tạo lớp; owner lấy từ session admin | `201` |
| `PATCH` | `/api/classes/:classId` | Admin | Cập nhật một phần thông tin lớp | `200` |
| `DELETE` | `/api/classes/:classId` | Admin | Xóa lớp và cascade enrollment | `204` |
| `GET` | `/api/classes/:classId/students` | Admin | Search và pagination danh sách học viên | `200` |

### Enrollments

| Method | Endpoint | Quyền | Mô tả | Thành công |
| --- | --- | --- | --- | --- |
| `POST` | `/api/classes/:classId/enrollments` | User | Đăng ký lớp bằng transaction và row lock | `201` |
| `DELETE` | `/api/classes/:classId/enrollments` | User | Hủy enrollment của user hiện tại | `200` |
| `GET` | `/api/enrollments/me` | User | Các lớp đã đăng ký; filter `upcoming/past/all` | `200` |

Request/response đầy đủ nằm trong [API contract](backend/docs/API_CONTRACT.md).

## Error contract

```json
{
  "error": {
    "code": "CLASS_FULL",
    "message": "This class has reached its maximum capacity"
  }
}
```

| HTTP | Error code chính | Khi xảy ra |
| ---: | --- | --- |
| `400` | `VALIDATION_ERROR`, `CURRENT_PASSWORD_INCORRECT`, `MALFORMED_JSON` | Body/query/params sai hoặc mật khẩu hiện tại sai |
| `401` | `AUTH_REQUIRED`, `INVALID_TOKEN`, `TOKEN_REVOKED`, `INVALID_CREDENTIALS` | Thiếu cookie, token sai/hết hạn/bị revoke hoặc login sai |
| `403` | `FORBIDDEN` | Role hoặc browser Origin không được phép |
| `404` | `CLASS_NOT_FOUND`, `ENROLLMENT_NOT_FOUND`, `ROUTE_NOT_FOUND` | Resource hoặc route không tồn tại |
| `409` | `EMAIL_ALREADY_EXISTS`, `DUPLICATE_ENROLLMENT`, `CLASS_FULL`, `CLASS_ALREADY_STARTED` | Xung đột dữ liệu hoặc business rule |
| `409` | `CAPACITY_BELOW_CURRENT_ENROLLMENTS` | Giảm capacity thấp hơn số học viên hiện tại |
| `413` | `PAYLOAD_TOO_LARGE` | JSON vượt giới hạn 10 KB |
| `429` | `TOO_MANY_REQUESTS` | Vượt auth rate limit |
| `503` | `DATABASE_UNAVAILABLE` | Health check không kết nối được PostgreSQL |

## Các vấn đề quan trọng đã xử lý

Bảng này chỉ liệt kê concern riêng của backend hiện tại, không lặp các concern frontend như multi-tab session, debounce, global Axios 401 handler hoặc dead assets.

| Mục | Trạng thái | Cách xử lý |
| --- | --- | --- |
| Search sai vì lọc sau pagination | ✅ Xong | Search và level filter chạy trong PostgreSQL trước `LIMIT/OFFSET` |
| Đăng ký trùng lớp | ✅ Xong | Service kiểm tra thân thiện và composite primary key bảo vệ cuối |
| Overbooking khi request đồng thời | ✅ Xong | Transaction khóa class bằng `SELECT ... FOR UPDATE`; trigger database là lớp bảo vệ cuối |
| Giảm capacity dưới enrollment hiện tại | ✅ Xong | Trigger từ chối và service map thành `409 CAPACITY_BELOW_CURRENT_ENROLLMENTS` |
| Role trong JWT bị cũ | ✅ Xong | JWT chỉ giữ `sub/tokenVersion`; mỗi protected request load user và role mới nhất từ database |
| JWT bị lộ qua response/Web Storage | ✅ Xong | JWT chỉ nằm trong HTTP-only cookie, API không trả raw token |
| Phân biệt email tồn tại khi login | ✅ Xong | Email không tồn tại và password sai trả cùng `INVALID_CREDENTIALS` |
| SQL injection | ✅ Xong | Toàn bộ value dùng parameterized query; dynamic update column dùng allowlist cố định |
| CSRF/CORS với cookie | ✅ Xong | Credentialed CORS dùng allowlist chính xác; unsafe request kiểm tra `Origin` |
| Migration bị sửa sau khi chạy | ✅ Xong | Theo dõi filename + SHA-256 checksum và dừng khi phát hiện drift |
| Test xóa nhầm database dev | ✅ Xong | Cleanup chỉ chạy khi PostgreSQL xác nhận database kết thúc bằng `_test` |
| Port đã được sử dụng | ✅ Xong | Bắt event `EADDRINUSE`, đóng database pool và kết thúc startup có kiểm soát |
| Lộ lỗi nội bộ production | ✅ Xong | Error handler không trả stack trace, SQL detail hoặc database credential |
| Secret bị commit | ✅ Xong | `.env`, coverage, build output và tài liệu local nhạy cảm đều được Git ignore |

## Cài đặt local

### Yêu cầu

- Node.js 20 trở lên.
- npm 10 trở lên.
- PostgreSQL 17.
- Một development database và một test database độc lập.

### Tạo database bằng pgAdmin

Mở Query Tool trên database `postgres`, thay password ví dụ trước khi chạy:

```sql
CREATE ROLE badminton_app_dev WITH LOGIN PASSWORD 'choose-a-local-password';
CREATE DATABASE badminton_booking_dev OWNER badminton_app_dev;
CREATE DATABASE badminton_booking_test OWNER badminton_app_dev;
```

Test suite có thao tác reset schema và chỉ chấp nhận database có tên kết thúc bằng `_test`.

### Environment

```powershell
Copy-Item backend/.env.example backend/.env
```

Điền giá trị local trong `backend/.env`. Không commit database password, JWT secret hoặc seed password.

### Cài dependency và chạy

```powershell
npm install
npm run db:check
npm run db:migrate
npm run db:seed
npm run dev
```

API local chạy tại `http://localhost:4000`.

## Kiểm thử

```powershell
npm run typecheck:server
npm run test:server
npm run test:coverage
npm run build:server
npm run verify:server
```

Kết quả verification gần nhất:

| Hạng mục | Kết quả |
| --- | ---: |
| Test files | 12/12 pass |
| Tests | 69/69 pass |
| Statements | 86.99% |
| Branches | 69.37% |
| Functions | 90.40% |
| Lines | 88.13% |
| npm audit | 0 vulnerability |

Integration tests bao phủ authentication, RBAC, class CRUD, search/filter/pagination, enrollment, database constraint, migration-from-empty và concurrent enrollment.

## Bảo mật và production

- Production cookie: `__Host-auth_session`, `Secure`, `HttpOnly`, `SameSite=Lax`, path `/`.
- Render sử dụng `PORT` do nền tảng cung cấp và `TRUST_PROXY=true`.
- Render Web Service nên dùng Internal Database URL cùng region.
- Không chạy development seed khi `NODE_ENV=production`.
- Frontend khác domain nên gọi backend qua rewrite/proxy `/api` để giữ cookie `SameSite=Lax`.
- Tài khoản admin production phải dùng mật khẩu ngẫu nhiên và được chuyển qua kênh riêng.

## Những kiến thức nên học tiếp

1. **Refresh token rotation và session table**
   Chuyển từ access token một ngày sang session có thể revoke từng thiết bị, theo dõi login và phát hiện token reuse.

2. **Keyset pagination**
   So sánh cursor pagination với `OFFSET` khi bảng classes/enrollments lớn và dữ liệu thay đổi liên tục.

3. **PostgreSQL isolation levels và deadlock**
   Thử `READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE`; học lock ordering và retry transaction.

4. **Query planning và index tuning**
   Dùng `EXPLAIN (ANALYZE, BUFFERS)`, theo dõi slow query và đánh giá GIN/B-tree index bằng dữ liệu lớn.

5. **Structured logging và observability**
   Thêm request ID, JSON logger, metrics, tracing và error monitoring thay cho log text đơn giản.

6. **Integration test production-like**
   Dùng Testcontainers/PostgreSQL container và CI pipeline thay vì phụ thuộc database test cài sẵn trên máy.

7. **OpenAPI và contract testing**
   Sinh schema/documentation có kiểm soát, kiểm tra frontend/backend không drift nhưng vẫn giữ business logic ở service.

8. **Deployment lifecycle**
   Tách lifecycle để test graceful shutdown, readiness/liveness và zero-downtime migration rõ hơn.

## Tài liệu

- [API contract](backend/docs/API_CONTRACT.md)
- [Backend specification](backend/docs/BACKEND_SPEC.md)

Hai tài liệu học local `POSTMAN_TEST_GUIDE.md` và `POSTGRESQL_LEARNING_GUIDE.md` được Git ignore theo chủ đích.
