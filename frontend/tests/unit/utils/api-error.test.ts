import { describe, expect, it } from 'vitest'
import { toAppApiError } from '../../../src/utils/api-error'

const axiosError = (code: string, message: string, details?: Record<string, string[]>) => ({
  isAxiosError: true,
  response: {
    status: 400,
    data: { error: { code, message, details } },
  },
})

describe('toAppApiError', () => {
  it('uses a localized message for a known backend error code', () => {
    const result = toAppApiError(
      axiosError('CLASS_FULL', 'This class has reached its maximum capacity'),
    )

    expect(result.message).toBe('Lớp học đã đủ chỗ.')
  })

  it('does not expose English backend validation details in form fields', () => {
    const result = toAppApiError(
      axiosError('VALIDATION_ERROR', 'Request body is invalid', {
        maxStudents: ['Invalid input: expected number, received NaN'],
      }),
    )

    expect(result.message).toBe('Dữ liệu gửi lên không hợp lệ.')
    expect(result.fieldErrors.maxStudents).toEqual(['Số học viên tối đa không hợp lệ.'])
  })

  it('preserves an already-localized field message', () => {
    const result = toAppApiError(
      axiosError('VALIDATION_ERROR', 'Request body is invalid', {
        email: ['Email không tồn tại.'],
      }),
    )

    expect(result.fieldErrors.email).toEqual(['Email không tồn tại.'])
  })
})
