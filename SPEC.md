# Đặc tả hệ thống đăng ký lớp học cầu lông

## 1. Tổng quan

Badminton Class Booking System dùng để công bố, quản lý và đăng ký các lớp học cầu lông. Hệ thống cung cấp danh sách lớp công khai, luồng đăng ký dành cho học viên và khu vực quản trị dành cho người có quyền quản trị.

Hệ thống gồm hai thành phần:

- **Backend API:** Node.js, TypeScript, Express và PostgreSQL.
- **Frontend:** React, TypeScript, React Router, TanStack Query và Axios.

## 2. Mục tiêu

- Cho phép khách truy cập tìm kiếm và xem thông tin các lớp sắp khai giảng.
- Cho phép người dùng tạo tài khoản, đăng nhập và quản lý các lớp đã đăng ký.
- Cho phép quản trị viên quản lý lớp học và danh sách học viên.
- Đảm bảo các quy tắc về quyền truy cập, đăng ký trùng, sĩ số và thời gian bắt đầu lớp được thực thi nhất quán.
- Cung cấp giao diện phản hồi rõ ràng cho trạng thái tải, dữ liệu rỗng, lỗi và thao tác thành công.
- Hỗ trợ triển khai frontend và backend độc lập nhưng vẫn duy trì luồng xác thực bằng HTTP-only cookie.

## 3. Phạm vi

### 3.1. Trong phạm vi

- Đăng ký, đăng nhập, đăng xuất và đổi mật khẩu.
- Phân quyền theo hai vai trò `admin` và `user`.
- Xem, tìm kiếm, lọc và phân trang danh sách lớp.
- Xem chi tiết lớp và sĩ số hiện tại.
- Đăng ký, hủy đăng ký và xem các lớp của người dùng.
- Tạo, cập nhật, xóa lớp và xem danh sách học viên của quản trị viên.
- Đồng bộ trạng thái xác thực khi phiên hết hạn hoặc thay đổi giữa nhiều tab trình duyệt.
- Validation request, xử lý lỗi thống nhất, rate limiting cho authentication và kiểm soát CORS.
- Swagger UI phục vụ tra cứu API.

### 3.2. Ngoài phạm vi

- Thanh toán học phí.
- Điểm danh và đánh giá học viên.
- Lịch học lặp được chuẩn hóa thành từng buổi học riêng.
- Danh sách chờ khi lớp đã đủ chỗ.
- Gửi email, SMS hoặc thông báo đẩy.
- Khôi phục mật khẩu qua email.
- Tải lên hoặc quản lý hình ảnh lớp học.

## 4. Vai trò và quyền hạn

| Vai trò | Khả năng                                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Khách   | Xem danh sách lớp sắp khai giảng, tìm kiếm, lọc và xem chi tiết lớp; đăng ký hoặc đăng nhập                  |
| User     | Có toàn bộ quyền của khách; đăng ký lớp, hủy đăng ký, xem các lớp đã đăng ký và đổi mật khẩu        |
| Admin    | Có toàn bộ quyền xem công khai; xem tất cả lớp, tạo, sửa, xóa lớp, xem danh sách học viên và đổi mật khẩu |

Tài khoản đăng ký từ giao diện hoặc API công khai luôn được tạo với vai trò `user`. Quyền `admin` không được cấp qua request đăng ký công khai.

## 5. Mô hình dữ liệu

### 5.1. User

| Thuộc tính                 | Kiểu/giới hạn       | Mô tả                                                   |
| ---------------------------- | ---------------------- | --------------------------------------------------------- |
| `id`                       | UUID                   | Khóa chính                                              |
| `name`                     | 2–100 ký tự         | Tên hiển thị                                           |
| `email`                    | Tối đa 255 ký tự   | Email được chuẩn hóa chữ thường và không trùng |
| `passwordHash`             | Chuỗi hash            | Mật khẩu đã được hash, không trả về client      |
| `role`                     | `admin \| user`       | Vai trò phân quyền                                     |
| `tokenVersion`             | Số nguyên không âm | Phiên bản dùng để thu hồi các JWT cũ              |
| `createdAt`, `updatedAt` | Timestamp              | Thời điểm tạo và cập nhật                          |

### 5.2. Class

| Thuộc tính                 | Kiểu/giới hạn                       | Mô tả                            |
| ---------------------------- | -------------------------------------- | ---------------------------------- |
| `id`                       | UUID                                   | Khóa chính                       |
| `title`                    | 3–150 ký tự                         | Tên lớp                          |
| `description`              | 10–5.000 ký tự                      | Mô tả dạng plain text           |
| `coachName`                | 2–100 ký tự                         | Tên huấn luyện viên            |
| `level`                    | `beginner \| intermediate \| advanced` | Trình độ lớp                   |
| `startDate`                | ISO 8601 có timezone                  | Thời điểm bắt đầu            |
| `schedule`                 | 3–255 ký tự                         | Lịch học mô tả bằng văn bản |
| `location`                 | 3–255 ký tự                         | Địa điểm học                  |
| `maxStudents`              | Số nguyên 1–500                     | Sĩ số tối đa                   |
| `createdBy`                | Tham chiếu User                       | Quản trị viên tạo lớp         |
| `createdAt`, `updatedAt` | Timestamp                              | Thời điểm tạo và cập nhật   |

Response lớp phải cung cấp số học viên hiện tại và sĩ số tối đa để giao diện xác định số chỗ còn lại.

### 5.3. Enrollment

| Thuộc tính   | Kiểu     | Mô tả                   |
| -------------- | --------- | ------------------------- |
| `classId`    | UUID      | Tham chiếu lớp          |
| `userId`     | UUID      | Tham chiếu người dùng |
| `enrolledAt` | Timestamp | Thời điểm đăng ký   |

Cặp `(classId, userId)` là khóa chính, bảo đảm một người dùng không thể đăng ký trùng một lớp.

## 6. Yêu cầu chức năng backend

### 6.1. Authentication

- Đăng ký bằng tên, email và mật khẩu; email được trim và chuyển thành chữ thường.
- Mật khẩu đăng ký và mật khẩu mới có tối thiểu 8 ký tự và không vượt giới hạn byte mà bcrypt hỗ trợ.
- Đăng nhập nhận tùy chọn `remember`:
  - `false`: tạo session cookie, hết hiệu lực khi đóng trình duyệt.
  - `true`: tạo persistent cookie có thời hạn tối đa 24 giờ.
- JWT chỉ được lưu trong cookie `HttpOnly`; frontend không đọc hoặc lưu JWT trong Web Storage.
- API lấy phiên hiện tại trả về thông tin user và thời điểm hết hạn phiên.
- Đăng xuất xóa authentication cookie kể cả khi phiên hiện tại không còn hợp lệ.
- Đổi mật khẩu yêu cầu mật khẩu hiện tại, mật khẩu mới khác mật khẩu cũ và thu hồi toàn bộ token cũ thông qua `tokenVersion`.
- Rate limiting được áp dụng cho đăng ký và đăng nhập.

### 6.2. Lớp học công khai

- Danh sách công khai chỉ trả về các lớp chưa bắt đầu.
- Danh sách hỗ trợ:
  - Tìm kiếm theo tên lớp.
  - Lọc theo trình độ.
  - Phân trang phía server.
- Search và filter phải được thực hiện trong PostgreSQL trước khi áp dụng pagination.
- Chi tiết lớp được truy cập công khai bằng UUID của lớp.
- Mỗi lớp hiển thị sĩ số hiện tại, sĩ số tối đa và dữ liệu cần thiết để xác định lớp còn chỗ hay không.

### 6.3. Enrollment

- Chỉ tài khoản có role `user` được đăng ký hoặc hủy đăng ký lớp.
- Đăng ký phải được thực hiện trong transaction và khóa bản ghi lớp nhằm ngăn overbooking khi có request đồng thời.
- Danh sách lớp đã đăng ký hỗ trợ phân trang và lọc `upcoming`, `past` hoặc `all`.
- Sau thao tác đăng ký hoặc hủy đăng ký, response phải phản ánh sĩ số mới nhất của lớp.

### 6.4. Quản trị lớp học

- Chỉ tài khoản có role `admin` được tạo, cập nhật và xóa lớp.
- Người tạo lớp được lấy từ session, không nhận tùy ý từ request body.
- Danh sách quản trị bao gồm cả lớp sắp diễn ra và lớp đã bắt đầu.
- Danh sách quản trị hỗ trợ tìm kiếm, lọc trình độ và phân trang phía server.
- Cập nhật lớp là cập nhật một phần và phải có ít nhất một trường hợp lệ.
- Danh sách học viên theo lớp hỗ trợ tìm kiếm theo thông tin học viên và phân trang.
- Xóa lớp đồng thời xóa các enrollment liên quan.

## 7. Quy tắc nghiệp vụ

1. Một user chỉ được đăng ký một lần cho mỗi lớp.
2. Không được đăng ký khi lớp đã đủ `maxStudents`.
3. Không được đăng ký khi lớp đã bắt đầu.
4. Không được hủy đăng ký sau khi lớp đã bắt đầu.
5. Không được chuyển ngày bắt đầu của một lớp đã bắt đầu về tương lai.
6. Không được giảm `maxStudents` xuống thấp hơn số học viên hiện tại.
7. Chỉ admin được tạo, sửa, xóa lớp và xem danh sách học viên.
8. Chỉ user được thực hiện nghiệp vụ enrollment; admin không đăng ký lớp bằng quyền quản trị.
9. `startDate` khi tạo lớp phải nằm trong tương lai.
10. `description` là plain text; client không được render trực tiếp dưới dạng HTML.
11. Kiểm tra sức chứa phải được bảo vệ ở cả service/transaction và database để chống race condition.
12. Quyền truy cập sử dụng role hiện tại trong database, không chỉ dựa vào role đã ghi trong JWT.

## 8. API contract tổng quát

Base path: `/api`

| Method     | Endpoint                          | Quyền        | Chức năng                              |
| ---------- | --------------------------------- | ------------- | ---------------------------------------- |
| `GET`    | `/health`                       | Public        | Kiểm tra API và kết nối PostgreSQL   |
| `POST`   | `/auth/register`                | Public        | Đăng ký user                          |
| `POST`   | `/auth/login`                   | Public        | Đăng nhập và thiết lập cookie      |
| `POST`   | `/auth/logout`                  | Public        | Xóa cookie đăng nhập                 |
| `GET`    | `/auth/me`                      | Authenticated | Lấy phiên hiện tại                   |
| `PUT`    | `/auth/change-password`         | Authenticated | Đổi mật khẩu và thu hồi phiên cũ |
| `GET`    | `/classes`                      | Public        | Danh sách lớp sắp khai giảng         |
| `GET`    | `/classes/:classId`             | Public        | Chi tiết lớp                           |
| `POST`   | `/classes`                      | Admin         | Tạo lớp                                |
| `PATCH`  | `/classes/:classId`             | Admin         | Cập nhật lớp                          |
| `DELETE` | `/classes/:classId`             | Admin         | Xóa lớp                                |
| `GET`    | `/classes/:classId/students`    | Admin         | Danh sách học viên của lớp          |
| `GET`    | `/admin/classes`                | Admin         | Danh sách quản trị tất cả lớp      |
| `POST`   | `/classes/:classId/enrollments` | User          | Đăng ký lớp                          |
| `DELETE` | `/classes/:classId/enrollments` | User          | Hủy đăng ký                          |
| `GET`    | `/enrollments/me`               | User          | Danh sách lớp đã đăng ký          |

Query pagination dùng `page` và `limit`; `limit` nằm trong khoảng 1–50. Chi tiết schema và example request/response được công bố qua Swagger UI tại `/api/docs/`.

### 8.1. Response thành công

Response dùng JSON với cấu trúc ổn định theo từng resource. Danh sách phân trang phải bao gồm dữ liệu trang hiện tại và metadata đủ để giao diện hiển thị điều hướng trang.

### 8.2. Response lỗi

```json
{
  "error": {
    "code": "CLASS_FULL",
    "message": "This class has reached its maximum capacity"
  }
}
```

Lỗi validation có thể bổ sung danh sách lỗi theo field. Các nhóm mã lỗi chính gồm:

- `400`: request không hợp lệ hoặc mật khẩu hiện tại không đúng.
- `401`: thiếu phiên, JWT không hợp lệ, hết hạn hoặc đã bị thu hồi.
- `403`: không đủ role hoặc Origin không được phép.
- `404`: resource hoặc route không tồn tại.
- `409`: xung đột email, enrollment, sức chứa hoặc trạng thái lớp.
- `413`: payload vượt giới hạn.
- `429`: vượt rate limit.
- `500`: lỗi nội bộ không dự kiến.
- `503`: database không sẵn sàng trong health check.

## 9. Yêu cầu chức năng frontend

### 9.1. Route và màn hình

| Route                                | Quyền        | Nội dung                                                                         |
| ------------------------------------ | ------------- | --------------------------------------------------------------------------------- |
| `/login`                           | Guest         | Đăng nhập và tùy chọn ghi nhớ phiên                                       |
| `/register`                        | Guest         | Đăng ký tài khoản user                                                       |
| `/classes`                         | Public        | Danh sách, tìm kiếm, lọc và phân trang lớp                                 |
| `/classes/:classId`                | Public        | Chi tiết, sĩ số và thao tác đăng ký/hủy phù hợp với trạng thái user |
| `/change-password`                 | Authenticated | Đổi mật khẩu                                                                  |
| `/my-classes`                      | User          | Danh sách lớp đã đăng ký theo trạng thái                                 |
| `/admin/classes`                   | Admin         | Danh sách quản trị lớp                                                        |
| `/admin/classes/new`               | Admin         | Tạo lớp                                                                         |
| `/admin/classes/:classId/edit`     | Admin         | Chỉnh sửa lớp                                                                  |
| `/admin/classes/:classId/students` | Admin         | Danh sách học viên                                                             |
| `/forbidden`                       | Public        | Thông báo không đủ quyền                                                    |
| Route không tồn tại               | Public        | Trang 404                                                                         |

### 9.2. Điều hướng và bảo vệ route

- Guest route chuyển người dùng đã đăng nhập ra khỏi trang login/register.
- Protected route yêu cầu phiên hợp lệ.
- User route và Admin route kiểm tra role trước khi hiển thị nội dung.
- Khi API protected trả `401`, frontend xóa auth state và điều hướng về login.
- Logout, đổi mật khẩu, hết hạn phiên và sự kiện phiên từ tab khác phải cập nhật ngay auth state của giao diện.
- Sau đăng nhập thành công, user và admin được điều hướng tới khu vực phù hợp với role.

### 9.3. Quản lý server state

- TanStack Query quản lý cache, loading, error, refetch và mutation.
- Mutation đăng ký/hủy đăng ký phải cập nhật hoặc invalidate dữ liệu lớp, chi tiết lớp và danh sách enrollment liên quan.
- Auth cache sử dụng giá trị `null` rõ ràng khi phiên kết thúc để các observer đang hoạt động không giữ user cũ.
- Search input được debounce và request cũ được hủy khi tham số thay đổi.
- Query string thể hiện page, search và filter phù hợp để có thể reload hoặc chia sẻ URL.

### 9.4. Trạng thái giao diện

- Mỗi màn hình lấy dữ liệu phải có loading state, empty state và error state.
- Form hiển thị validation error tại field tương ứng khi backend cung cấp field errors.
- Toast được dùng cho phản hồi thành công hoặc lỗi của mutation.
- Nút submit bị vô hiệu hóa trong lúc request đang xử lý để tránh gửi lặp.
- Ngày giờ không hợp lệ không được làm giao diện crash.
- Giao diện phải sử dụng được trên desktop và thiết bị di động phổ biến.

## 10. Yêu cầu bảo mật

- Mật khẩu được hash bằng bcrypt và không xuất hiện trong response hoặc log.
- JWT secret, database URL, mật khẩu seed và thông tin nhạy cảm chỉ được cung cấp qua environment variables.
- Không commit file `.env` hoặc secret vào Git.
- Cookie production sử dụng `HttpOnly`, `Secure`, `SameSite=Lax`, path `/` và tên có prefix `__Host-`.
- Request thay đổi trạng thái từ browser phải đi qua kiểm tra Origin.
- CORS chỉ cho phép same-origin hoặc origin nằm trong allowlist và hỗ trợ credentials.
- SQL sử dụng parameterized query.
- Request body được validation bằng schema strict; field không được định nghĩa bị từ chối.
- JSON body có giới hạn kích thước.
- Security headers được thiết lập bằng Helmet.
- Thông báo lỗi không làm lộ stack trace, câu SQL, database credential hoặc JWT.

## 11. Kiến trúc

### 11.1. Backend

```text
Route
→ Validation / Authentication / Authorization
→ Controller
→ Service
→ Model
→ PostgreSQL
```

- Controller xử lý HTTP input/output.
- Service thực thi business rule và điều phối transaction.
- Model chứa truy vấn PostgreSQL và mapping dữ liệu.
- Database trigger bảo vệ các invariant quan trọng trước request đồng thời hoặc thao tác ngoài API.
- Error handler tập trung chuyển lỗi ứng dụng và PostgreSQL thành error contract thống nhất.

### 11.2. Frontend

```text
Page
→ Domain Hook
→ Typed Service
→ Axios Client
→ Backend API
```

- Page tổ chức luồng và bố cục màn hình.
- Component chứa UI dùng lại hoặc UI theo domain.
- Hook bao bọc query/mutation và cache invalidation.
- Service định nghĩa lời gọi HTTP có type.
- Route guard xử lý authentication và role-based access.
- Context chỉ dùng cho UI state dùng chung như toast, không thay thế server-state cache.

## 12. Yêu cầu phi chức năng

- Node.js phiên bản 20 trở lên.
- Mã nguồn sử dụng TypeScript và vượt qua typecheck trước khi merge.
- Backend hỗ trợ PostgreSQL với migration có thể chạy lặp an toàn theo cơ chế migration của dự án.
- API public có pagination để tránh trả tập dữ liệu không giới hạn.
- Hệ thống phải xử lý đúng request enrollment đồng thời mà không vượt sĩ số.
- Frontend production build thành công và hỗ trợ SPA route fallback.
- Backend cung cấp health endpoint kiểm tra cả tiến trình API và kết nối database.
- Code được format thống nhất và không chứa dead code hoặc secret.

## 13. Kiểm thử

### 13.1. Backend

- Unit test cho validation, helper và business rule độc lập.
- Integration test với PostgreSQL test database cho authentication, class và enrollment API.
- Kiểm thử các trường hợp đăng ký trùng, lớp đầy, lớp đã bắt đầu và request đồng thời.
- Kiểm thử RBAC cho cả user và admin.
- Kiểm thử cookie, token revocation, CORS, rate limit và error contract.

### 13.2. Frontend

- Unit test cho utility và auth cache lifecycle.
- Component/integration test với Testing Library và MSW cho các luồng quan trọng.
- Kiểm thử route guard, field error, toast và cache invalidation.
- Kiểm thử observer đang hoạt động nhận `null` ngay khi phiên bị xóa.
- Typecheck, test và production build phải hoàn thành thành công.

## 14. Tiêu chí 

- Khách xem được danh sách và chi tiết lớp sắp khai giảng.
- Search, level filter và pagination hoạt động trên toàn bộ dữ liệu từ backend.
- User đăng ký và hủy đăng ký thành công, giao diện cập nhật sĩ số mà không cần reload trang.
- Hệ thống từ chối enrollment trùng, lớp đầy và lớp đã bắt đầu.
- User xem được danh sách lớp đã đăng ký theo trạng thái.
- Admin tạo, sửa, xóa lớp và xem đúng danh sách học viên.
- User không truy cập được chức năng admin; admin không dùng endpoint enrollment dành cho user.
- Đổi mật khẩu thu hồi phiên cũ và yêu cầu đăng nhập lại.
- Logout hoặc session expiry cập nhật ngay trạng thái giao diện, không tạo vòng điều hướng.
- Loading, empty, error và success feedback xuất hiện đúng ngữ cảnh.
- API error có status và error code phù hợp.
- Backend typecheck, test và build thành công.
- Frontend format check, typecheck, test và build thành công.
- Production frontend kết nối được production backend qua cấu hình proxy/rewrite phù hợp.
- Repository không chứa API key, JWT secret, database credential hoặc file `.env`.
