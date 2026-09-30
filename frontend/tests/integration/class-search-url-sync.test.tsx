import { act, screen } from '@testing-library/react'
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
})
