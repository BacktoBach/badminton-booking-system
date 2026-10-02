import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AdminClassesPage } from '../../src/pages/admin/AdminClassesPage'
import { StudentsPage } from '../../src/pages/admin/StudentsPage'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { server } from '../msw/server'

const emptyPage = (limit: number) => ({
  data: [],
  meta: { page: 1, limit, totalItems: 0, totalPages: 0 },
})

describe('admin search debounce', () => {
  it('updates the admin class query after typing without submitting', async () => {
    const searches: string[] = []
    server.use(
      http.get('*/api/admin/classes', ({ request }) => {
        searches.push(new URL(request.url).searchParams.get('search') ?? '')
        return HttpResponse.json(emptyPage(9))
      }),
    )
    renderWithProviders(<AdminClassesPage />, { route: '/admin/classes' })

    await userEvent.setup().type(screen.getByPlaceholderText('Tìm theo tên lớp...'), 'smash')

    await waitFor(() => expect(searches).toContain('smash'))
  })

  it('updates the student query after typing without submitting', async () => {
    const searches: string[] = []
    server.use(
      http.get('*/api/classes/class-1/students', ({ request }) => {
        searches.push(new URL(request.url).searchParams.get('search') ?? '')
        return HttpResponse.json(emptyPage(20))
      }),
    )
    renderWithProviders(
      <Routes>
        <Route path="/admin/classes/:classId/students" element={<StudentsPage />} />
      </Routes>,
      { route: '/admin/classes/class-1/students' },
    )

    await userEvent
      .setup()
      .type(screen.getByPlaceholderText('Tìm theo tên hoặc email...'), 'student')

    await waitFor(() => expect(searches).toContain('student'))
  })
})
