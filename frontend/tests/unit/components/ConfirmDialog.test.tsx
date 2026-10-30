import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from '../../../src/components/ui/ConfirmDialog'

function DialogFixture({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Hủy đăng ký</button>
      {open && (
        <ConfirmDialog
          message="Hủy đăng ký lớp “Cơ bản”?"
          onClose={() => setOpen(false)}
          onConfirm={onConfirm}
        />
      )}
    </>
  )
}

describe('ConfirmDialog', () => {
  it('requires confirmation and returns focus after cancellation', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<DialogFixture onConfirm={onConfirm} />)
    const trigger = screen.getByRole('button', { name: 'Hủy đăng ký' })
    await user.click(trigger)
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveAccessibleDescription('Hủy đăng ký lớp “Cơ bản”?')
    expect(screen.getByRole('button', { name: 'Không, giữ lại' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(onConfirm).not.toHaveBeenCalled()
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Không, giữ lại' }))
    expect(onConfirm).not.toHaveBeenCalled()
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
