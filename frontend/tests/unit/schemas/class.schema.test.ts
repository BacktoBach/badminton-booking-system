import { describe, expect, it } from 'vitest'
import { classEditFormSchema } from '../../../src/schemas/class.schema'

const validClass = {
  title: 'Lớp cầu lông cơ bản',
  description: 'Lớp dành cho người mới bắt đầu.',
  coachName: 'Coach An',
  level: 'beginner',
  startDate: '2030-05-10T19:30',
  schedule: 'Thứ 3 và Thứ 5',
  location: 'Sân số 1',
  maxStudents: 12,
}

describe('class form schema', () => {
  it('shows a Vietnamese error when capacity is not a number', () => {
    const result = classEditFormSchema.safeParse({ ...validClass, maxStudents: Number.NaN })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.maxStudents).toContain(
        'Vui lòng nhập số học viên tối đa',
      )
    }
  })

  it('shows Vietnamese messages for schedule and location constraints', () => {
    const result = classEditFormSchema.safeParse({ ...validClass, schedule: '', location: '' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.schedule).toContain('Lịch học cần ít nhất 3 ký tự')
      expect(result.error.flatten().fieldErrors.location).toContain('Địa điểm cần ít nhất 3 ký tự')
    }
  })
})
