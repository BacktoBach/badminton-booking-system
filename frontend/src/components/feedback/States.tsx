import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../ui/Button'

export const LoadingState = () => (
  <div className="grid gap-4 sm:grid-cols-2" role="status" aria-live="polite">
    <span className="sr-only">Đang tải dữ liệu…</span>
    <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
    <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
  </div>
)

export function UpdatingContent({
  updating,
  label,
  children,
}: {
  updating: boolean
  label: string
  children: ReactNode
}) {
  return (
    <div className="relative" aria-busy={updating}>
      {updating && (
        <div
          className="absolute inset-x-0 top-3 z-10 mx-auto flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-lg"
          role="status"
          aria-live="polite"
          aria-label={label}
        >
          <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
          {label}…
        </div>
      )}
      <div
        inert={updating || undefined}
        className={`transition-opacity ${updating ? 'pointer-events-none opacity-50' : ''}`}
      >
        {children}
      </div>
    </div>
  )
}

export const EmptyState = ({
  title = 'Chưa có dữ liệu',
  message = 'Không tìm thấy nội dung phù hợp.',
}) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
    <Inbox className="mx-auto text-slate-400" />
    <h2 className="mt-3 text-lg font-bold">{title}</h2>
    <p className="mt-1 text-slate-500">{message}</p>
  </div>
)
export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
    <AlertCircle className="mx-auto text-rose-600" />
    <h2 className="mt-3 font-bold text-rose-900">Không thể tải dữ liệu</h2>
    <p className="mt-1 text-sm text-rose-700">{message}</p>
    {onRetry && (
      <Button className="mt-4" onClick={onRetry}>
        Thử lại
      </Button>
    )}
  </div>
)
