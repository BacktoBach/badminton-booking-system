import { act, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { authKeys } from '../../src/config/auth-cache'
import { useCurrentUser } from '../../src/hooks/auth/useAuth'
import { authService } from '../../src/services/auth.service'
import type { AuthSession } from '../../src/types/auth.types'
import { createTestQueryClient, renderWithProviders } from '../helpers/renderWithProviders'
import { server } from '../msw/server'

const session: AuthSession = {
  user: {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
  },
  session: { expiresAt: '2030-01-01T00:00:00.000Z' },
}

function SessionProbe() {
  const currentUser = useCurrentUser()

  if (currentUser.isPending) return <p>Đang tải</p>
  if (currentUser.isError) return <p>Lỗi phiên</p>

  return <p>{currentUser.data?.user.name ?? 'Khách'}</p>
}

describe('/auth/me session synchronization', () => {
  it('replaces a cached user with guest state when the server returns 401', async () => {
    server.use(
      http.get('*/api/auth/me', () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 },
        ),
      ),
    )
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(authKeys.me(), session)

    renderWithProviders(<SessionProbe />, { queryClient })
    expect(screen.getByText('Test User')).toBeInTheDocument()

    await act(() => queryClient.invalidateQueries({ queryKey: authKeys.me(), exact: true }))

    expect(await screen.findByText('Khách')).toBeInTheDocument()
    expect(queryClient.getQueryData(authKeys.me())).toBeNull()
  })

  it('keeps non-authentication failures visible to the query error flow', async () => {
    server.use(
      http.get('*/api/auth/me', () =>
        HttpResponse.json(
          { error: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable' } },
          { status: 503 },
        ),
      ),
    )

    await expect(authService.me()).rejects.toMatchObject({ response: { status: 503 } })
  })
})
