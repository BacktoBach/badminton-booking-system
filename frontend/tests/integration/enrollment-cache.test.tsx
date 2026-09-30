import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { classKeys } from '../../src/hooks/classes/useClasses'
import { enrollmentKeys, useEnroll } from '../../src/hooks/enrollments/useEnrollments'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { server } from '../msw/server'

const classId = '20000000-0000-4000-8000-000000000001'

function EnrollButton() {
  const enroll = useEnroll(classId)
  return (
    <button onClick={() => enroll.mutate()} disabled={enroll.isPending}>
      Đăng ký kiểm thử
    </button>
  )
}

describe('enrollment cache synchronization', () => {
  it('invalidates class and enrollment queries after enrolling', async () => {
    server.use(
      http.post(`*/api/classes/${classId}/enrollments`, () =>
        HttpResponse.json({
          data: {
            id: classId,
            title: 'Lớp cơ bản',
            description: 'Lớp cầu lông dành cho người mới bắt đầu.',
            coachName: 'Coach An',
            level: 'beginner',
            startDate: '2030-01-01T00:00:00.000Z',
            schedule: 'Thứ 3 và Thứ 5',
            location: 'Sân số 1',
            currentStudents: 1,
            maxStudents: 12,
            availableSlots: 11,
            isFull: false,
          },
        }),
      ),
    )
    const listKey = classKeys.list({ page: 1 })
    const detailKey = classKeys.detail(classId)
    const enrollmentKey = enrollmentKeys.mine({ page: 1, status: 'upcoming' })
    const { queryClient } = renderWithProviders(<EnrollButton />)
    queryClient.setQueryData(listKey, { data: [], meta: {} })
    queryClient.setQueryData(detailKey, { id: classId })
    queryClient.setQueryData(enrollmentKey, { data: [], meta: {} })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Đăng ký kiểm thử' }))

    await waitFor(() => {
      expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
      expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true)
      expect(queryClient.getQueryState(enrollmentKey)?.isInvalidated).toBe(true)
    })
  })
})
