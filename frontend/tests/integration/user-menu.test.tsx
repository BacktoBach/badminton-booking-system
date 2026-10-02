import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { authKeys } from '../../src/config/auth-cache'
import { MainLayout } from '../../src/layouts/MainLayout'
import type { AuthSession } from '../../src/types/auth.types'
import { createTestQueryClient, renderWithProviders } from '../helpers/renderWithProviders'

const session: AuthSession = {
  user: {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
  },
  session: { expiresAt: '2030-01-01T00:00:00.000Z' },
}

describe('user menu', () => {
  it('closes when clicking outside or navigating', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(authKeys.me(), session)
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/classes" element={<h1>Danh sách lớp</h1>} />
          <Route path="/change-password" element={<h1>Đổi mật khẩu</h1>} />
        </Route>
      </Routes>,
      { route: '/classes', queryClient },
    )

    const details = screen.getByText('Test User').closest('details')
    const summary = details?.querySelector('summary')
    expect(details).not.toBeNull()
    expect(summary).not.toBeNull()

    await user.click(summary!)
    expect(details).toHaveAttribute('open')

    await user.click(screen.getByRole('main'))
    expect(details).not.toHaveAttribute('open')

    await user.click(summary!)
    await user.click(screen.getByRole('link', { name: 'Đổi mật khẩu' }))

    expect(await screen.findByRole('heading', { name: 'Đổi mật khẩu' })).toBeInTheDocument()
    expect(details).not.toHaveAttribute('open')
  })
})
