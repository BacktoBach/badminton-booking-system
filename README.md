# Badminton Class Booking System

Ứng dụng full-stack quản lý lớp học cầu lông. Backend dùng Node.js, TypeScript, Express 5 và PostgreSQL với raw parameterized SQL; frontend dùng React, TypeScript, React Query và HTTP-only cookie authentication.

## Liên kết

| Môi trường      | URL                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Backend production | [badminton-booking-system-0xi7.onrender.com](https://badminton-booking-system-0xi7.onrender.com)                       |
| Health check       | [badminton-booking-system-0xi7.onrender.com/api/health](https://badminton-booking-system-0xi7.onrender.com/api/health) |
| Swagger UI         | [badminton-booking-system-0xi7.onrender.com/api/docs/](https://badminton-booking-system-0xi7.onrender.com/api/docs/) |

Production đã được kiểm tra với Render PostgreSQL: health check, public class list và Postman authentication đều hoạt động.

## Tài khoản admin

| Role      | Email                  | Mật khẩu      |
| --------- | ---------------------- | --------------- |
| `admin` | `testdb@example.com` | `Password123` |

Đây là tài khoản kiểm thử tạm thời và sẽ được xóa sau khi hoàn tất review.

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

```text
Frontend Page
→ React Query Hook
→ Service
→ Axios client
→ Backend API
```

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

frontend/
├─ src/components/ UI component dùng chung và theo domain
├─ src/config/     Axios, environment và QueryClient
├─ src/contexts/   Toast notification context
├─ src/hooks/      React Query hooks theo domain
├─ src/layouts/    Main, authentication và admin layout
├─ src/pages/      Public, user và admin pages
├─ src/routes/     Protected route và role guard
├─ src/services/   Typed HTTP services
├─ src/types/      API và domain types
└─ src/utils/      Error normalization và helper
```

## API endpoints

### Health và authentication

| Method   | Endpoint                      | Quyền            | Mô tả                                       | Thành công |
| -------- | ----------------------------- | ----------------- | --------------------------------------------- | ------------ |
| `GET`  | `/api/health`               | Public            | Kiểm tra API và PostgreSQL                  | `200`      |
| `POST` | `/api/auth/register`        | Public            | Đăng ký tài khoản với role`user`      | `201`      |
| `POST` | `/api/auth/login`           | Public            | Đăng nhập và thiết lập HTTP-only cookie | `200`      |
| `POST` | `/api/auth/logout`          | Public            | Xóa authentication cookie                    | `200`      |
| `GET`  | `/api/auth/me`              | Đã đăng nhập | Lấy user và thời điểm hết hạn session  | `200`      |
| `PUT`  | `/api/auth/change-password` | Đã đăng nhập | Đổi mật khẩu và thu hồi token cũ       | `200`      |

### Classes

| Method     | Endpoint                           | Quyền | Mô tả                                                                   | Thành công |
| ---------- | ---------------------------------- | ------ | ------------------------------------------------------------------------- | ------------ |
| `GET`    | `/api/classes`                   | Public | Danh sách lớp sắp khai giảng, search, lọc trình độ và pagination | `200`      |
| `GET`    | `/api/classes/:classId`          | Public | Chi tiết lớp và số chỗ hiện tại                                    | `200`      |
| `GET`    | `/api/admin/classes`             | Admin  | Danh sách tất cả lớp, gồm cả lớp đã bắt đầu                   | `200`      |
| `POST`   | `/api/classes`                   | Admin  | Tạo lớp; người tạo lấy từ session admin                            | `201`      |
| `PATCH`  | `/api/classes/:classId`          | Admin  | Cập nhật một phần thông tin lớp                                     | `200`      |
| `DELETE` | `/api/classes/:classId`          | Admin  | Xóa lớp và cascade enrollment                                          | `204`      |
| `GET`    | `/api/classes/:classId/students` | Admin  | Search và pagination danh sách học viên                               | `200`      |

### Enrollments

| Method     | Endpoint                              | Quyền | Mô tả                                                                  | Thành công |
| ---------- | ------------------------------------- | ------ | ------------------------------------------------------------------------ | ------------ |
| `POST`   | `/api/classes/:classId/enrollments` | User   | Đăng ký lớp bằng transaction và row lock                           | `201`      |
| `DELETE` | `/api/classes/:classId/enrollments` | User   | Hủy đăng ký của user hiện tại                                     | `200`      |
| `GET`    | `/api/enrollments/me`               | User   | Các lớp đã đăng ký; lọc theo`upcoming`, `past` hoặc `all` | `200`      |

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

|    HTTP | Error code chính                                                                             | Khi xảy ra                                                            |
| ------: | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `400` | `VALIDATION_ERROR`, `CURRENT_PASSWORD_INCORRECT`, `MALFORMED_JSON`                      | Body/query/params sai hoặc mật khẩu hiện tại sai                  |
| `401` | `AUTH_REQUIRED`, `INVALID_TOKEN`, `TOKEN_REVOKED`, `INVALID_CREDENTIALS`              | Thiếu cookie, token sai/hết hạn/bị thu hồi hoặc đăng nhập sai |
| `403` | `FORBIDDEN`                                                                                 | Role hoặc browser Origin không được phép                         |
| `404` | `CLASS_NOT_FOUND`, `ENROLLMENT_NOT_FOUND`, `ROUTE_NOT_FOUND`                            | Resource hoặc route không tồn tại                                  |
| `409` | `EMAIL_ALREADY_EXISTS`, `DUPLICATE_ENROLLMENT`, `CLASS_FULL`, `CLASS_ALREADY_STARTED` | Xung đột dữ liệu hoặc business rule                               |
| `409` | `CAPACITY_BELOW_CURRENT_ENROLLMENTS`                                                        | Giảm capacity thấp hơn số học viên hiện tại                    |
| `413` | `PAYLOAD_TOO_LARGE`                                                                         | JSON vượt giới hạn 10 KB                                           |
| `429` | `TOO_MANY_REQUESTS`                                                                         | Vượt auth rate limit                                                 |
| `503` | `DATABASE_UNAVAILABLE`                                                                      | Health check không kết nối được PostgreSQL                       |

## Cài đặt local

### Yêu cầu

- Node.js 20 trở lên.
- npm 10 trở lên.
- PostgreSQL 17.
- Một development database và một test database độc lập.

### Environment

```powershell
Copy-Item backend/.env.example backend/.env
```

Điền giá trị local trong `backend/.env`. Không commit database password, JWT secret hoặc seed password.

### Cài dependency và chạy backend

```powershell
npm install
npm run db:check
npm run db:migrate
npm run db:seed
npm run dev
```

API local chạy tại `http://localhost:4000`.

### Chạy frontend

Mở terminal thứ hai sau khi backend đang chạy:

```powershell
Copy-Item frontend/.env.example frontend/.env
npm run dev:client
```

Frontend local chạy tại `http://localhost:5173`. Vite proxy `/api` tới backend local nên browser gửi HTTP-only cookie theo cùng origin.

Kiểm tra frontend trước khi commit:

```powershell
npm run verify:client
```

## Bảo mật và production

- Production cookie: `__Host-auth_session`, `Secure`, `HttpOnly`, `SameSite=Lax`, path `/`.
- Render sử dụng `PORT` do nền tảng cung cấp và `TRUST_PROXY=true`.
- Render Web Service nên dùng Internal Database URL cùng region.
- Không chạy development seed khi `NODE_ENV=production`.
- Frontend khác domain nên gọi backend qua rewrite/proxy `/api` để giữ cookie `SameSite=Lax`.
