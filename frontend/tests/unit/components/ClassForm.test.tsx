import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ClassForm, buildClassUpdateInput } from '../../../src/components/classes/ClassForm'

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
      startDate: '2030-05-10T12:30:00.000Z',
    })
  })
})

describe('ClassForm API errors', () => {
  it('applies backend field errors from the mutation callback', async () => {
    const user = userEvent.setup()
    render(
      <ClassForm
        mode="create"
        pending={false}
        onSubmit={(_, { handleApiError }) => {
          handleApiError({
            isAxiosError: true,
            response: {
              status: 400,
              data: {
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Dữ liệu lớp học không hợp lệ.',
                  details: {
                    title: ['Tên lớp đã tồn tại.'],
                    maxStudents: ['Sức chứa không hợp lệ.'],
                  },
                },
              },
            },
          })
        }}
      />,
    )

    await user.type(screen.getByLabelText('Tên lớp'), 'Lớp cơ bản')
    await user.type(screen.getByLabelText('Mô tả'), 'Lớp dành cho người mới bắt đầu.')
    await user.type(screen.getByLabelText('Huấn luyện viên'), 'Coach An')
    fireEvent.change(screen.getByLabelText('Ngày khai giảng (giờ VN)'), {
      target: { value: '2035-01-01T19:30' },
    })
    await user.type(screen.getByLabelText('Lịch học'), 'Thứ 3 và Thứ 5')
    await user.type(screen.getByLabelText('Địa điểm'), 'Sân số 1')
    await user.click(screen.getByRole('button', { name: 'Lưu lớp học' }))

    expect(await screen.findByText('Tên lớp đã tồn tại.')).toBeInTheDocument()
    expect(screen.getByText('Sức chứa không hợp lệ.')).toBeInTheDocument()
  })
})
