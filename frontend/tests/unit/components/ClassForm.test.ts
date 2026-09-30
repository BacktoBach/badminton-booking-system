import { describe, expect, it } from 'vitest'
import { buildClassUpdateInput } from '../../../src/components/classes/ClassForm'

const values = {
  title: 'Lớp cầu lông nâng cao',
  description: 'Nội dung lớp học đã được cập nhật đầy đủ.',
  coachName: 'Coach An',
  level: 'advanced' as const,
  startDate: '2030-05-10T19:30',
  schedule: 'Thứ 3 và Thứ 5',
  location: 'Sân số 2',
  maxStudents: 18,
}

describe('buildClassUpdateInput', () => {
  it('only includes fields changed by the admin', () => {
    expect(buildClassUpdateInput(values, { title: true, maxStudents: true })).toEqual({
      title: values.title,
      maxStudents: 18,
    })
  })

  it('does not resend an unchanged start date', () => {
    expect(buildClassUpdateInput(values, { schedule: true })).toEqual({
      schedule: values.schedule,
    })
  })

  it('normalizes a changed start date to ISO format', () => {
    expect(buildClassUpdateInput(values, { startDate: true })).toEqual({
      startDate: new Date(values.startDate).toISOString(),
    })
  })
})
