import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'

type ConfirmDialogProps = {
  message: string
  onConfirm: () => void
  onClose: () => void
  pending?: boolean
}

export function ConfirmDialog({
  message,
  onConfirm,
  onClose,
  pending = false,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    return () => previousFocus.current?.focus()
  }, [])

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !pending) onClose()
    if (event.key !== 'Tab') return
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
    )
    if (buttons.length === 0) return
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onKeyDown={onKeyDown}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 id="confirm-title" className="text-xl font-bold text-slate-950">
          Xác nhận thao tác
        </h2>
        <p id="confirm-message" className="mt-3 text-slate-700">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button ref={cancelRef} variant="secondary" disabled={pending} onClick={onClose}>
            Không, giữ lại
          </Button>
          <Button variant="danger" disabled={pending} onClick={onConfirm}>
            {pending ? 'Đang xử lý…' : 'Xác nhận'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
