import { useEffect } from 'react'
import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { authKeys, clearAuthSession } from '../../src/config/auth-cache'
import { apiClient, setUnauthorizedHandler } from '../../src/config/axios'
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
  useEffect(() => {
    void apiClient.get('/test-protected').catch(() => undefined)
  }, [])
  return <h1>Nội dung riêng tư</h1>
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
    setUnauthorizedHandler(clearAuthSession)

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<h1>Trang đăng nhập</h1>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/private" element={<ProtectedRequest />} />
        </Route>
      </Routes>,
      { route: '/private', queryClient },
    )

    expect(await screen.findByRole('heading', { name: 'Trang đăng nhập' })).toBeInTheDocument()
    expect(queryClient.getQueryData(authKeys.me())).toBeNull()
  })
})
