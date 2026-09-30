import { screen } from '@testing-library/react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { authKeys } from '../../src/config/auth-cache'
import { AdminRoute } from '../../src/routes/AdminRoute'
import { ProtectedRoute } from '../../src/routes/ProtectedRoute'
import type { AuthSession } from '../../src/types/auth.types'
import { createTestQueryClient, renderWithProviders } from '../helpers/renderWithProviders'

const userSession: AuthSession = {
  user: {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Test User',
    email: 'user@example.com',
    role: 'user',
  },
  session: { expiresAt: '2030-01-01T00:00:00.000Z' },
}

const TestRoutes = () => (
  <Routes>
    <Route path="/login" element={<h1>Trang đăng nhập</h1>} />
    <Route path="/forbidden" element={<h1>Không có quyền truy cập</h1>} />
    <Route element={<ProtectedRoute />}>
      <Route path="/my-classes" element={<h1>Lớp của tôi</h1>} />
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<Outlet />}>
          <Route index element={<Navigate to="classes" replace />} />
          <Route path="classes" element={<h1>Quản lý lớp</h1>} />
        </Route>
      </Route>
    </Route>
  </Routes>
)

describe('route guards', () => {
  it('redirects a guest from a protected route to login', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(authKeys.me(), null)

    renderWithProviders(<TestRoutes />, { route: '/my-classes', queryClient })

    expect(await screen.findByRole('heading', { name: 'Trang đăng nhập' })).toBeInTheDocument()
  })

  it('redirects a regular user away from admin routes', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(authKeys.me(), userSession)

    renderWithProviders(<TestRoutes />, { route: '/admin/classes', queryClient })

    expect(
      await screen.findByRole('heading', { name: 'Không có quyền truy cập' }),
    ).toBeInTheDocument()
  })
})
