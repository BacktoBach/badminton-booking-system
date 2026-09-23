import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { ToastProvider, useToast } from './ToastContext'

function Trigger({ duration = 4200 }: { duration?: number }) { const { showToast } = useToast(); useEffect(() => showToast({ type: 'success', message: 'Đã lưu', duration }), [duration, showToast]); return null }
describe('ToastProvider', () => {
  it('shows and manually dismisses a toast', async () => { const user = userEvent.setup(); render(<ToastProvider><Trigger duration={0} /></ToastProvider>); expect(screen.getByRole('status')).toHaveTextContent('Đã lưu'); await user.click(screen.getByRole('button', { name: 'Đóng thông báo' })); expect(screen.queryByRole('status')).not.toBeInTheDocument() })
  it('automatically dismisses a toast', () => { vi.useFakeTimers(); render(<ToastProvider><Trigger duration={1000} /></ToastProvider>); act(() => vi.advanceTimersByTime(1001)); expect(screen.queryByRole('status')).not.toBeInTheDocument(); vi.useRealTimers() })
})
