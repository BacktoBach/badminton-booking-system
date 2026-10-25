import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ClassForm, buildClassUpdateInput } from '../../../src/components/classes/ClassForm'
import { businessDateTimeInputToIso } from '../../../src/utils/date'

const values = {
  title: 'Lớp cầu lông nâng cao',
  description: 'Nội dung lớp học đã được cập nhật đầy đủ.',
  coachName: 'Coach An',
  level: 'advanced' as const,
  startDate: '2030-05-10T19:30',
  schedule: 'Thứ 3 và Thứ 5',
  location: 'Sân số 2',
  maxStudents: 18,
  tuitionVnd: 0,
}

async function pickNextMonthDate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Ngày khai giảng (giờ VN)' }))
  const currentMonth = screen.getByTestId('startDate-picker-month').getAttribute('data-month')!
  const [year, month] = currentMonth.split('-').map(Number)
  const nextMonth = new Date(Date.UTC(year, month, 1))
  await user.click(screen.getByRole('button', { name: 'Tháng sau' }))
  await user.click(
    screen.getByRole('button', {
      name: `Chọn ngày 1/${nextMonth.getMonth() + 1}/${nextMonth.getFullYear()}`,
    }),
  )
  await user.selectOptions(screen.getByLabelText('Giờ'), '19')
  await user.selectOptions(screen.getByLabelText('Phút'), '30')
  await user.click(screen.getByRole('button', { name: 'Xong' }))
  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01T19:30`
}

async function chooseSchedule(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Thứ 3' }))
  await user.click(screen.getByRole('button', { name: 'Thứ 5' }))
  await user.selectOptions(screen.getByLabelText('Giờ học'), '19')
  await user.selectOptions(screen.getByLabelText('Phút học'), '30')
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
  it('submits the selected Vietnam date and time as UTC', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ClassForm mode="create" pending={false} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Tên lớp'), 'Lớp cơ bản')
    await user.type(screen.getByLabelText('Mô tả'), 'Lớp dành cho người mới bắt đầu.')
    await user.type(screen.getByLabelText('Huấn luyện viên'), 'Coach An')
    const selectedDate = await pickNextMonthDate(user)
    await chooseSchedule(user)
    await user.type(screen.getByLabelText('Địa điểm'), 'Sân số 1')
    await user.click(screen.getByRole('button', { name: 'Lưu lớp học' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: businessDateTimeInputToIso(selectedDate),
        schedule: 'Thứ 3, Thứ 5 - 19:30',
      }),
      expect.any(Object),
    )
  })

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
    await pickNextMonthDate(user)
    await chooseSchedule(user)
    await user.type(screen.getByLabelText('Địa điểm'), 'Sân số 1')
    await user.click(screen.getByRole('button', { name: 'Lưu lớp học' }))

    expect(await screen.findByText('Tên lớp đã tồn tại.')).toBeInTheDocument()
    expect(screen.getByText('Sức chứa không hợp lệ.')).toBeInTheDocument()
  })
})
