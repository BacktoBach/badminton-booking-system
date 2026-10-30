# Badminton Class Booking System

Ứng dụng full-stack quản lý lớp học cầu lông. Backend dùng Node.js, TypeScript, Express 5 và PostgreSQL với raw parameterized SQL; frontend dùng React, TypeScript, React Query và HTTP-only cookie authentication.

## Liên kết

| Môi trường          | URL                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Backend production  | [noble-luck-production-5799.up.railway.app](https://noble-luck-production-5799.up.railway.app)                         |
| Frontend production | [badminton-booking-system-frontend.vercel.app](https://badminton-booking-system-frontend.vercel.app)                   |
| Health check        | [noble-luck-production-5799.up.railway.app/api/health](https://noble-luck-production-5799.up.railway.app/api/health)   |
| Swagger UI          | [noble-luck-production-5799.up.railway.app/api/docs/](https://noble-luck-production-5799.up.railway.app/api/docs/)     |

Production sử dụng backend và PostgreSQL trên Railway, frontend trên Vercel.

## Tài khoản admin

| Role    | Email                | Mật khẩu      |
| ------- | -------------------- | ------------- |
| `admin` | `testdb@example.com` | `Password123` |

Đây là tài khoản kiểm thử tạm thời và sẽ được xóa sau khi hoàn tất review.

## Chức năng chính

- Authentication bằng JWT trong HTTP-only cookie.
- Đổi mật khẩu làm mất hiệu lực toàn bộ token cũ thông qua `token_version`.
- Quên mật khẩu qua email Resend bằng link dùng một lần, hết hạn sau 20 phút.
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
├─ src/utils/      Error normalization và helper
└─ tests/          Unit, integration, MSW handlers và test helpers

e2e/
├─ pages/          Page Object Model cho auth, class và admin
├─ specs/          Critical user journeys chạy qua UI, API và PostgreSQL thật
└─ support/        Test data dùng chung
```

## API endpoints

### Health và authentication

| Method | Endpoint                    | Quyền        | Mô tả                                   | Thành công |
| ------ | --------------------------- | ------------ | --------------------------------------- | ---------- |
| `GET`  | `/api/health`               | Public       | Kiểm tra API và PostgreSQL              | `200`      |
| `POST` | `/api/auth/register`        | Public       | Đăng ký tài khoản với role`user`        | `201`      |
| `POST` | `/api/auth/login`           | Public       | Đăng nhập và thiết lập HTTP-only cookie | `200`      |
| `POST` | `/api/auth/logout`          | Public       | Xóa authentication cookie               | `200`      |
| `GET`  | `/api/auth/me`              | Đã đăng nhập | Lấy user và thời điểm hết hạn session   | `200`      |
| `PUT`  | `/api/auth/change-password` | Đã đăng nhập | Đổi mật khẩu và thu hồi token cũ        | `200`      |
| `POST` | `/api/auth/forgot-password` | Public       | Gửi link đặt lại mật khẩu               | `202`      |
| `POST` | `/api/auth/reset-password`  | Public       | Đặt lại mật khẩu và thu hồi phiên cũ    | `200`      |

### Classes

| Method   | Endpoint                         | Quyền  | Mô tả                                                            | Thành công |
| -------- | -------------------------------- | ------ | ---------------------------------------------------------------- | ---------- |
| `GET`    | `/api/classes`                   | Public | Danh sách lớp sắp khai giảng, search, lọc trình độ và pagination | `200`      |
| `GET`    | `/api/classes/:classId`          | Public | Chi tiết lớp và số chỗ hiện tại                                  | `200`      |
| `GET`    | `/api/admin/classes`             | Admin  | Danh sách tất cả lớp, gồm cả lớp đã bắt đầu                      | `200`      |
| `POST`   | `/api/classes`                   | Admin  | Tạo lớp; người tạo lấy từ session admin                          | `201`      |
| `PATCH`  | `/api/classes/:classId`          | Admin  | Cập nhật một phần thông tin lớp                                  | `200`      |
| `DELETE` | `/api/classes/:classId`          | Admin  | Xóa lớp và cascade enrollment                                    | `204`      |
| `GET`    | `/api/classes/:classId/students` | Admin  | Search và pagination danh sách học viên                          | `200`      |

### Enrollments

| Method   | Endpoint                            | Quyền | Mô tả                                                     | Thành công |
| -------- | ----------------------------------- | ----- | --------------------------------------------------------- | ---------- |
| `POST`   | `/api/classes/:classId/enrollments` | User  | Đăng ký lớp bằng transaction và row lock                  | `201`      |
| `DELETE` | `/api/classes/:classId/enrollments` | User  | Hủy đăng ký của user hiện tại                             | `200`      |
| `GET`    | `/api/enrollments/me`               | User  | Các lớp đã đăng ký; lọc theo`upcoming`, `past` hoặc `all` | `200`      |

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

|  HTTP | Error code chính                                                                                                                                        | Khi xảy ra                                                    |
| ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `400` | `VALIDATION_ERROR`, `CURRENT_PASSWORD_INCORRECT`, `MALFORMED_JSON`                                                                                      | Body/query/params sai hoặc mật khẩu hiện tại sai              |
| `401` | `AUTH_REQUIRED`, `INVALID_TOKEN`, `TOKEN_REVOKED`, `INVALID_CREDENTIALS`                                                                                | Thiếu cookie, token sai/hết hạn/bị thu hồi hoặc đăng nhập sai |
| `403` | `FORBIDDEN`                                                                                                                                             | Role hoặc browser Origin không được phép                      |
| `404` | `CLASS_NOT_FOUND`, `ENROLLMENT_NOT_FOUND`, `ROUTE_NOT_FOUND`                                                                                            | Resource hoặc route không tồn tại                             |
| `409` | `EMAIL_ALREADY_EXISTS`, `DUPLICATE_ENROLLMENT`, `CLASS_FULL`, `CLASS_ALREADY_STARTED`, `CLASS_NOT_FULL`, `DUPLICATE_WAITLIST`, `WAITLIST_OFFER_EXPIRED` | Xung đột dữ liệu hoặc business rule                           |
| `409` | `CAPACITY_BELOW_CURRENT_ENROLLMENTS`                                                                                                                    | Giảm capacity thấp hơn số học viên hiện tại                   |
| `413` | `PAYLOAD_TOO_LARGE`                                                                                                                                     | JSON vượt giới hạn 10 KB                                      |
| `429` | `TOO_MANY_REQUESTS`                                                                                                                                     | Vượt giới hạn tần suất; xem header `Retry-After`              |
| `503` | `DATABASE_UNAVAILABLE`                                                                                                                                  | Health check không kết nối được PostgreSQL                    |

Giới hạn theo từng nhóm: đăng ký/hủy lớp dùng chung mức 20 lần/10 phút cho mỗi tài khoản và 100 lần/10 phút cho mỗi IP; danh sách/chi tiết lớp công khai dùng chung mức 600 lần/5 phút cho mỗi IP. Login/register có giới hạn riêng. Bộ đếm hiện lưu trong bộ nhớ của từng tiến trình backend; nếu chạy nhiều replica, cần chuyển sang store dùng chung để giới hạn chính xác toàn hệ thống.

### Cấu hình quên mật khẩu

Chạy migration `004_password_reset.sql` trước khi triển khai backend. Trên Railway, cấu hình `RESEND_API_KEY`, `MAIL_FROM` (địa chỉ thuộc domain đã xác minh với Resend) và `PASSWORD_RESET_URL=https://badminton-booking-system-frontend.vercel.app/reset-password` cho từng môi trường production/staging. Đặt `PASSWORD_RESET_URL` theo đúng frontend tương ứng; không dùng URL preview ngẫu nhiên. Không đưa API key vào frontend. Sau khi deploy, thử gửi link tới một tài khoản kiểm thử và xác nhận link dùng được một lần, hết hạn sau 20 phút, còn phiên cũ bị từ chối. Token nằm trong phần `#token=` của URL và được xóa khỏi thanh địa chỉ khi trang mở.

### Email thông báo lớp học và thanh toán

Chạy migration `005_email_outbox.sql` trước khi triển khai backend. Backend dùng cùng `RESEND_API_KEY`, `MAIL_FROM` và origin của `PASSWORD_RESET_URL` để gửi link chi tiết lớp học. Mỗi sự kiện đăng ký thành công, thanh toán thành công hoặc cần kiểm tra, hết hạn giữ chỗ, đổi lịch/địa điểm và hủy lớp được ghi vào `email_outbox` cùng giao dịch dữ liệu. Backend quét lớp sắp khai giảng trong 24 giờ mỗi phút và gửi tối đa 5 email mỗi 15 giây; lỗi tạm thời được thử lại tối đa 5 lần với cùng idempotency key. Kiểm tra số bản ghi `failed_at IS NOT NULL` trong `email_outbox` khi vận hành để xử lý email gửi thất bại.

### Danh sách chờ lớp học

Chạy migration `007_waitlist.sql` trước khi triển khai backend. Học viên có thể tham gia danh sách chờ khi lớp đã đủ chỗ; thứ tự được giữ theo thời điểm tham gia. Khi có chỗ trống, backend giữ chỗ cho người tiếp theo trong 2 giờ và gửi email qua outbox. Học viên xác nhận trên trang chi tiết lớp hoặc mục “Lớp của tôi”; lớp thu phí tiếp tục quy trình thanh toán hiện tại với thời hạn thanh toán 15 phút. Các lượt giữ chỗ đang chờ xác nhận được tính vào sức chứa và được bảo vệ bằng khóa transaction cùng database trigger. Worker backend kiểm tra lời mời hết hạn mỗi 30 giây.

### Chính sách hủy lớp và hoàn tiền

Học viên có thể tự hủy đăng ký trước giờ khai giảng ít nhất 24 giờ. Học viên đã thanh toán cần liên hệ quản trị viên để đối soát; hệ thống không tự chuyển khoản hoàn. Khi trung tâm hủy lớp, lớp được đánh dấu đã hủy và giữ nguyên lịch sử đăng ký, thanh toán. Học viên đã thanh toán được hoàn 100% học phí đã nhận; email thông báo khoản hoàn đang chờ đối soát. Quản trị viên chuyển khoản hoàn bên ngoài hệ thống, nhập mã giao dịch và xác nhận đã hoàn trên trang học viên của lớp đã hủy. Không xác nhận trước khi tiền thực sự được chuyển. Chạy migration `006_class_cancellations.sql` trước khi deploy backend mới.

### Trang pháp lý và yêu cầu xóa dữ liệu

Chạy migration `008_legal_consent_requests.sql` trước khi triển khai backend yêu cầu đồng ý điều khoản. Trang đăng ký yêu cầu học viên đồng ý với Điều khoản sử dụng và Chính sách bảo mật; backend lưu thời điểm và phiên bản nội dung đã đồng ý. Trang Chính sách bảo mật cho học viên gửi yêu cầu xóa dữ liệu. Yêu cầu được lưu trong `data_deletion_requests` để người vận hành kiểm tra, liên hệ và xử lý theo nghĩa vụ lưu trữ; hệ thống không tự xóa tài khoản hoặc lịch sử thanh toán.

Trước khi công bố, chủ dự án cần duyệt nội dung ba trang `/terms`, `/privacy`, `/refund-policy` và xác định đầu mối tiếp nhận, thời hạn xử lý yêu cầu dữ liệu. Sau khi triển khai, kiểm tra đăng ký mới, truy cập các trang công khai và tạo yêu cầu xóa thử bằng tài khoản học viên; kiểm tra bản ghi tương ứng trong `data_deletion_requests`.

### Lịch học lặp hàng tuần

Chạy migration `009_recurring_classes.sql` trước khi triển khai backend. Khi tạo lớp, quản trị viên có thể chọn tạo chuỗi, các thứ trong tuần và ngày kết thúc; giờ được lấy từ ngày khai giảng theo giờ Việt Nam. Mỗi buổi là một lớp riêng, học viên đăng ký và thanh toán riêng. Có thể sửa hoặc hủy từng buổi; thao tác với cả chuỗi áp dụng cho các buổi chưa bắt đầu và chưa bị hủy. Đổi ngày giờ được thực hiện ở từng buổi. Hủy chuỗi dùng quy trình thông báo và đối soát hoàn tiền như hủy từng lớp.

### Điểm danh và ảnh lớp học

Chạy migration `010_class_attendance_images.sql` trước khi triển khai backend. Trong trang quản lý lớp, admin mở mục điểm danh để hiển thị QR tại buổi học và xem danh sách học viên đã đến. QR chỉ được tạo từ 30 phút trước đến 2 giờ sau giờ bắt đầu, có hiệu lực 1 phút. Học viên quét mã, đăng nhập bằng tài khoản đã đăng ký và xác nhận có mặt; mỗi tài khoản chỉ được điểm danh một lần cho mỗi buổi. QR có thể được chuyển tiếp trong thời gian còn hiệu lực, vì vậy admin vẫn cần kiểm tra người có mặt khi cần đối chiếu danh tính.

Để tải ảnh lớp, cấu hình `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` và `CLOUDINARY_API_SECRET` trên backend Railway cho từng môi trường. Chỉ backend giữ API secret. Admin chọn ảnh JPEG, PNG hoặc WebP tối đa 5 MB trên trang sửa lớp; ảnh xuất hiện ở danh sách và trang chi tiết lớp. Nếu chưa cấu hình Cloudinary, API tải ảnh trả lỗi 503 nhưng các chức năng khác vẫn hoạt động. Sau deploy, kiểm tra một lượt tải ảnh thật, xem ảnh trên mobile và thử quét QR bằng tài khoản học viên đã ghi danh.

## Cài đặt local

### Giám sát lỗi backend

Đặt `SENTRY_DSN` trong Variables của backend trên Railway cho từng môi trường cần giám sát; dùng DSN của project backend trong Sentry. Khi biến để trống, ứng dụng vẫn chạy nhưng không gửi lỗi. Không commit giá trị thật vào `.env.example`. Backend gửi lỗi HTTP 500 ngoài dự kiến, lỗi khởi động và lỗi các tác vụ nền tới Sentry. Event không kèm request body, header, cookie, query string hoặc user; log Railway ghi JSON với `requestId`, phương thức, đường dẫn, status và thời gian xử lý. Header `X-Request-ID` giúp đối chiếu phản hồi với log và tag `request_id` trong Sentry.

Frontend dùng project Sentry riêng: đặt `VITE_SENTRY_DSN` và `VITE_SENTRY_ENVIRONMENT` trong Vercel cho từng môi trường, sau đó redeploy vì Vite nhúng biến lúc build. DSN frontend là giá trị công khai trong bundle; không dùng auth token của Sentry ở đây. React render error và lỗi JavaScript chưa xử lý được ghi nhận; cấu hình bỏ request, user và breadcrumbs trước khi gửi. CSP cho phép kết nối tới Sentry ingest.

Sau khi deploy, kiểm tra một lỗi ngoài dự kiến trong môi trường staging và xác nhận event xuất hiện đúng project/environment. Tạo alert cho issue mới và lỗi tăng đột biến trong Sentry; tiếp tục dùng monitor `/api/health` để báo khi API hoặc database không phản hồi. Không dùng production để chủ động gây lỗi thử.

Kịch bản tải đăng ký: `npm run load:enrollment --workspace backend`. Script chỉ chấp nhận `TEST_DATABASE_URL` trỏ tới PostgreSQL local có tên kết thúc `_test`, tạo dữ liệu tạm, gửi 50 yêu cầu đồng thời vào lớp 10 chỗ và tự dọn dữ liệu. Lượt đo local ngày 2026-10-30: **103,6 RPS; p95 468 ms; 10 đăng ký thành công, 40 phản hồi lớp đầy, sĩ số cuối 10/10**. Đây là số liệu trên máy local qua loopback; cần đo lại ở staging trước go-live để biết độ trễ hạ tầng thật.

### Yêu cầu

- Node.js 22.12 trở lên.
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

### Cài ứng dụng PWA

Bản build frontend có manifest, icon cho desktop/Android/iOS và service worker. Sau khi deploy phiên bản này, trên Chrome hoặc Edge, mở website qua HTTPS rồi chọn **Cài đặt ứng dụng** trên thanh địa chỉ; trên iPhone/iPad, dùng **Chia sẻ → Thêm vào Màn hình chính**. Chế độ `npm run dev:client` không bật service worker; để kiểm tra PWA local, chạy `npm run build:client` rồi `npm run preview --workspace frontend`.

PWA chỉ lưu sẵn giao diện tĩnh để có thể mở ứng dụng khi mất mạng. Danh sách lớp, phiên đăng nhập, học viên và thao tác đăng ký luôn cần API; phản hồi `/api/*` không được lưu trong service worker cache. Khi có phiên bản mới, ứng dụng hiện nút cập nhật để người dùng tự tải lại sau khi lưu form đang nhập.

### Chạy E2E tests

E2E dùng Playwright với một PostgreSQL database riêng. Mỗi lần chạy, database này bị reset hoàn toàn rồi migrate và seed lại; tuyệt đối không trỏ `E2E_DATABASE_URL` tới database development, integration test hoặc production. Tên database phải chứa `e2e` hoặc `test`.

Tạo database `badminton_booking_e2e` trong pgAdmin, sau đó chạy:

```powershell
$env:E2E_DATABASE_URL = "postgresql://postgres:your_password@127.0.0.1:5432/badminton_booking_e2e"
npm run test:e2e:install
npm run typecheck:e2e
npm run test:e2e
```

Mặc định Playwright dùng Chromium đã được cài bởi `test:e2e:install`. Nếu Chromium không thể khởi động trên Windows nhưng máy đã có Google Chrome, đặt `$env:PLAYWRIGHT_BROWSER_CHANNEL = "chrome"` trước khi chạy test.

Playwright tự khởi động backend tại `http://127.0.0.1:4000` và frontend tại `http://127.0.0.1:5173`. Không chạy hai server này thủ công khi bắt đầu E2E.

Các chế độ chạy khác:

```powershell
npm run test:e2e:headed
npm run test:e2e:ui
```

Test data cố định chỉ tồn tại trong database E2E:

| Role  | Email                   | Mật khẩu       |
| ----- | ----------------------- | -------------- |
| Admin | `admin.e2e@example.com` | `AdminE2E123!` |
| User  | `user.e2e@example.com`  | `UserE2E123!`  |

Workflow `.github/workflows/e2e.yml` chạy Chromium cùng PostgreSQL 17 cho pull request và nhánh `main`, đồng thời luôn lưu Playwright report để kiểm tra kết quả.

## Bảo mật và production

- Production cookie: `__Host-auth_session`, `Secure`, `HttpOnly`, `SameSite=Lax`, path `/`.
- Render sử dụng `PORT` do nền tảng cung cấp và `TRUST_PROXY=true`.
- Render Web Service nên dùng Internal Database URL cùng region.
- Không chạy development seed khi `NODE_ENV=production`.
- Frontend khác domain nên gọi backend qua rewrite/proxy `/api` để giữ cookie `SameSite=Lax`.
