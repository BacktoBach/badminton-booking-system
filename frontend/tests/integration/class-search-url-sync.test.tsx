import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Link, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ClassListPage } from '../../src/pages/classes/ClassListPage'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { server } from '../msw/server'

function TestPage() {
  return (
    <>
      <Link to="/classes">Xóa tìm kiếm trên URL</Link>
      <ClassListPage />
    </>
  )
}

describe('class search URL synchronization', () => {
  it('updates the search input when navigation changes the URL', async () => {
    server.use(
      http.get('*/api/classes', () =>
        HttpResponse.json({
          data: [],
          meta: { page: 1, limit: 8, totalItems: 0, totalPages: 0 },
        }),
      ),
    )

    renderWithProviders(
      <Routes>
        <Route path="/classes" element={<TestPage />} />
      </Routes>,
      { route: '/classes?search=smash' },
    )
    const searchInput = screen.getByPlaceholderText('Tìm theo tên lớp...')

    expect(searchInput).toHaveValue('smash')
    await userEvent.setup().click(screen.getByRole('link', { name: 'Xóa tìm kiếm trên URL' }))

    expect(searchInput).toHaveValue('')
    await act(() => new Promise((resolve) => window.setTimeout(resolve, 350)))
    expect(searchInput).toHaveValue('')
  })

  it('announces background loading while keeping placeholder results visible', async () => {
    let finishSearch: (() => void) | undefined
    const searchPending = new Promise<void>((resolve) => {
      finishSearch = resolve
    })
    server.use(
      http.get('*/api/classes', async ({ request }) => {
        const search = new URL(request.url).searchParams.get('search')
        if (search) {
          await searchPending
          return HttpResponse.json({
            data: [],
            meta: { page: 1, limit: 8, totalItems: 0, totalPages: 0 },
          })
        }
        return HttpResponse.json({
          data: [
            {
              id: '20000000-0000-4000-8000-000000000001',
              title: 'Lớp cầu lông cơ bản',
              description: 'Dành cho người mới bắt đầu.',
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
          ],
          meta: { page: 1, limit: 8, totalItems: 1, totalPages: 1 },
        })
      }),
    )
    renderWithProviders(
      <Routes>
        <Route path="/classes" element={<ClassListPage />} />
      </Routes>,
      { route: '/classes' },
    )

    expect(await screen.findByText('Lớp cầu lông cơ bản')).toBeInTheDocument()
    await userEvent.setup().type(screen.getByPlaceholderText('Tìm theo tên lớp...'), 'nâng cao')

    expect(
      await screen.findByRole('status', { name: 'Đang cập nhật danh sách lớp' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Lớp cầu lông cơ bản')).toBeInTheDocument()

    await act(async () => finishSearch?.())
    await waitFor(() =>
      expect(
        screen.queryByRole('status', { name: 'Đang cập nhật danh sách lớp' }),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Không tìm thấy lớp')).toBeInTheDocument()
  })
})
