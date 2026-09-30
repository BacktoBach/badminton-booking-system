import axios from 'axios'
import type { ApiErrorBody, AppApiError } from '../types/api.types'

const apiErrorMessages: Record<string, string> = {
  VALIDATION_ERROR: 'Dữ liệu gửi lên không hợp lệ.',
  EMAIL_ALREADY_EXISTS: 'Email này đã được đăng ký.',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác.',
  CURRENT_PASSWORD_INCORRECT: 'Mật khẩu hiện tại không chính xác.',
  AUTH_REQUIRED: 'Vui lòng đăng nhập để tiếp tục.',
  INVALID_TOKEN: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
  TOKEN_REVOKED: 'Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  TOO_MANY_REQUESTS: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
  CLASS_NOT_FOUND: 'Không tìm thấy lớp học.',
  CAPACITY_BELOW_CURRENT_ENROLLMENTS: 'Sức chứa không thể thấp hơn số học viên hiện tại.',
  DUPLICATE_ENROLLMENT: 'Bạn đã đăng ký lớp học này.',
  CLASS_FULL: 'Lớp học đã đủ chỗ.',
  CLASS_ALREADY_STARTED: 'Lớp học đã bắt đầu.',
  ENROLLMENT_NOT_FOUND: 'Không tìm thấy đăng ký lớp học.',
  ROUTE_NOT_FOUND: 'Không tìm thấy đường dẫn yêu cầu.',
  DATABASE_UNAVAILABLE: 'Cơ sở dữ liệu tạm thời không khả dụng.',
  MALFORMED_JSON: 'Dữ liệu JSON không hợp lệ.',
  PAYLOAD_TOO_LARGE: 'Dữ liệu gửi lên vượt quá giới hạn.',
  INTERNAL_SERVER_ERROR: 'Máy chủ gặp lỗi. Vui lòng thử lại sau.',
}

const invalidFieldMessages: Record<string, string> = {
  name: 'Họ tên không hợp lệ.',
  email: 'Email không hợp lệ.',
  password: 'Mật khẩu không hợp lệ.',
  oldPassword: 'Mật khẩu hiện tại không hợp lệ.',
  newPassword: 'Mật khẩu mới không hợp lệ.',
  title: 'Tên lớp không hợp lệ.',
  description: 'Mô tả không hợp lệ.',
  coachName: 'Tên huấn luyện viên không hợp lệ.',
  level: 'Trình độ không hợp lệ.',
  startDate: 'Ngày khai giảng không hợp lệ.',
  schedule: 'Lịch học không hợp lệ.',
  location: 'Địa điểm không hợp lệ.',
  maxStudents: 'Số học viên tối đa không hợp lệ.',
  search: 'Từ khóa tìm kiếm không hợp lệ.',
  page: 'Số trang không hợp lệ.',
  limit: 'Giới hạn kết quả không hợp lệ.',
  classId: 'Mã lớp học không hợp lệ.',
}

const hasVietnameseCharacters = (message: string) => /[À-ỹ]/u.test(message)

const localizeFieldErrors = (details: Record<string, string[]> | undefined) =>
  Object.fromEntries(
    Object.entries(details ?? {}).map(([field, messages]) => [
      field,
      messages.map((message) =>
        hasVietnameseCharacters(message)
          ? message
          : (invalidFieldMessages[field] ?? 'Giá trị không hợp lệ.'),
      ),
    ]),
  )

export const toAppApiError = (error: unknown): AppApiError => {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return {
      status: 0,
      code: 'UNKNOWN_ERROR',
      message: 'Đã có lỗi không xác định xảy ra.',
      fieldErrors: {},
    }
  }

  if (error.code === 'ECONNABORTED') {
    return {
      status: 0,
      code: 'REQUEST_TIMEOUT',
      message: 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.',
      fieldErrors: {},
    }
  }

  const body = error.response?.data.error
  const code = body?.code ?? (error.response ? 'API_ERROR' : 'NETWORK_ERROR')
  const localizedServerMessage =
    body?.message && hasVietnameseCharacters(body.message) ? body.message : undefined
  return {
    status: error.response?.status ?? 0,
    code,
    message:
      localizedServerMessage ??
      apiErrorMessages[code] ??
      (error.response ? 'Không thể xử lý yêu cầu.' : 'Không thể kết nối máy chủ.'),
    fieldErrors: localizeFieldErrors(body?.details),
  }
}

export const getErrorMessage = (error: unknown) => toAppApiError(error).message
