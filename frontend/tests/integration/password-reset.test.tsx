import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { ForgotPasswordPage } from '../../src/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../../src/pages/auth/ResetPasswordPage'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { server } from '../msw/server'

afterEach(() => window.history.replaceState({}, '', '/'))

describe('password reset pages', () => {
  it('shows the same neutral confirmation after a reset email request', async () => {
    server.use(
      http.post('/api/auth/forgot-password', () =>
        HttpResponse.json({ message: 'Accepted' }, { status: 202 }),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />, { route: '/forgot-password' })

    await user.type(screen.getByLabelText('Email đăng ký'), 'member@example.com')
    await user.click(screen.getByRole('button', { name: 'Gửi link đặt lại mật khẩu' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Nếu email đã đăng ký')
  })

  it('clears the reset token from the address bar and submits the new password', async () => {
    const token = 'a'.repeat(64)
    window.history.replaceState({}, '', `/reset-password#token=${token}`)
    let submittedToken = ''
    server.use(
      http.post('/api/auth/reset-password', async ({ request }) => {
        submittedToken = ((await request.json()) as { token: string }).token
        return HttpResponse.json({ message: 'Password reset' })
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password' })

    expect(window.location.hash).toBe('')
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'NewPassword123')
    await user.type(screen.getByLabelText('Xác nhận mật khẩu'), 'NewPassword123')
    await user.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Đặt lại mật khẩu thành công')
    expect(submittedToken).toBe(token)
  })
})
