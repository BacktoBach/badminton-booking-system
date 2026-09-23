import axios from 'axios'
import type { ApiErrorBody, AppApiError } from '../types/api.types'

export const toAppApiError = (error: unknown): AppApiError => {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return { status: 0, code: 'UNKNOWN_ERROR', message: 'Đã có lỗi không xác định xảy ra.', fieldErrors: {} }
  }

  if (error.code === 'ECONNABORTED') {
    return { status: 0, code: 'REQUEST_TIMEOUT', message: 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.', fieldErrors: {} }
  }

  const body = error.response?.data.error
  return {
    status: error.response?.status ?? 0,
    code: body?.code ?? (error.response ? 'API_ERROR' : 'NETWORK_ERROR'),
    message: body?.message ?? (error.response ? 'Không thể xử lý yêu cầu.' : 'Không thể kết nối máy chủ.'),
    fieldErrors: body?.details ?? {},
  }
}

export const getErrorMessage = (error: unknown) => toAppApiError(error).message
