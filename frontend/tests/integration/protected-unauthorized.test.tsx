import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SessionLifecycle } from '../../src/components/auth/SessionLifecycle'
import { authKeys } from '../../src/config/auth-cache'
import { apiClient } from '../../src/config/axios'
import { queryClient } from '../../src/config/query-client'
import { ProtectedRoute } from '../../src/routes/ProtectedRoute'
import type { AuthSession } from '../../src/types/auth.types'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { server } from '../msw/server'

const session: AuthSession = {
  user: {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Test User',
    email: 'user@example.com',
    role: 'user',
  },
  session: { expiresAt: '2030-01-01T00:00:00.000Z' },
}

function ProtectedRequest() {
  return (
    <button onClick={() => void apiClient.get('/test-protected').catch(() => undefined)}>
      Gọi API riêng tư
    </button>
  )
}

function LoginPage() {
  const location = useLocation()
  return (
    <>
      <h1>Trang đăng nhập</h1>
      <p>{(location.state as { from?: string } | null)?.from}</p>
    </>
  )
}

describe('protected API unauthorized handling', () => {
  it('clears the auth cache and redirects to login after a 401 response', async () => {
    server.use(
      http.get('*/api/test-protected', () =>
        HttpResponse.json(
          { error: { code: 'AUTH_REQUIRED', message: 'Authentication is required' } },
          { status: 401 },
        ),
      ),
    )
    queryClient.setQueryData(authKeys.me(), session)

    renderWithProviders(
      <>
        <SessionLifecycle />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/my-classes" element={<ProtectedRequest />} />
          </Route>
        </Routes>
      </>,
      { route: '/my-classes?status=upcoming', queryClient },
    )

    await userEvent.setup().click(screen.getByRole('button', { name: 'Gọi API riêng tư' }))

    expect(await screen.findByRole('heading', { name: 'Trang đăng nhập' })).toBeInTheDocument()
    expect(screen.getByText('/my-classes?status=upcoming')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Phiên đăng nhập đã hết hạn')
    expect(queryClient.getQueryData(authKeys.me())).toBeNull()
  })

  it('shows the expiry warning without leaving a public route', async () => {
    server.use(
      http.get('*/api/test-protected', () =>
        HttpResponse.json(
          { error: { code: 'AUTH_REQUIRED', message: 'Authentication is required' } },
          { status: 401 },
        ),
      ),
    )
    queryClient.setQueryData(authKeys.me(), session)

    renderWithProviders(
      <>
        <SessionLifecycle />
        <Routes>
          <Route
            path="/classes/:classId"
            element={
              <>
                <h1>Chi tiết lớp</h1>
                <ProtectedRequest />
              </>
            }
          />
        </Routes>
      </>,
      { route: '/classes/class-1', queryClient },
    )

    await userEvent.setup().click(screen.getByRole('button', { name: 'Gọi API riêng tư' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Phiên đăng nhập đã hết hạn')
    expect(screen.getByRole('heading', { name: 'Chi tiết lớp' })).toBeInTheDocument()
  })
})
