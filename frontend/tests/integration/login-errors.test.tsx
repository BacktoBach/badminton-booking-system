import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LoginPage } from '../../src/pages/auth/LoginPage'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { server } from '../msw/server'

describe('login form API errors', () => {
  it('shows backend field errors on the corresponding inputs', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Thông tin đăng nhập không hợp lệ.',
              details: {
                email: ['Email không tồn tại.'],
                password: ['Mật khẩu không chính xác.'],
              },
            },
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/login' },
    )

    await user.type(screen.getByLabelText('Email đăng ký'), 'member@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'Password123')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(await screen.findByText('Email không tồn tại.')).toBeInTheDocument()
    expect(screen.getByText('Mật khẩu không chính xác.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Thông tin đăng nhập không hợp lệ.')
  })
})
