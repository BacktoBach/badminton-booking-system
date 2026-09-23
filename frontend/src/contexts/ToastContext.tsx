import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'
type ToastInput = { type?: ToastType; title?: string; message: string; duration?: number }
type Toast = Required<Pick<ToastInput, 'message' | 'duration'>> & Pick<ToastInput, 'title'> & { id: string; type: ToastType }
type ToastContextValue = { showToast: (input: string | ToastInput, type?: ToastType, title?: string) => void; removeToast: (id: string) => void }

const ToastContext = createContext<ToastContextValue | null>(null)
const config = {
  success: { icon: CheckCircle2, title: 'Thành công', color: 'text-emerald-700', bar: 'bg-emerald-500' },
  error: { icon: AlertCircle, title: 'Có lỗi xảy ra', color: 'text-rose-700', bar: 'bg-rose-500' },
  warning: { icon: AlertTriangle, title: 'Cảnh báo', color: 'text-amber-700', bar: 'bg-amber-500' },
  info: { icon: Info, title: 'Thông tin', color: 'text-sky-700', bar: 'bg-sky-500' },
} as const

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, number>())

  const removeToast = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  useEffect(() => {
    const activeTimers = timers.current
    return () => activeTimers.forEach(window.clearTimeout)
  }, [])

  const showToast = useCallback((input: string | ToastInput, type: ToastType = 'success', title?: string) => {
    const options = typeof input === 'string' ? { message: input } : input
    const toast: Toast = { id: crypto.randomUUID(), type: options.type ?? type, title: options.title ?? title, message: options.message, duration: options.duration ?? 4200 }
    setToasts((current) => {
      const next = [...current, toast]
      next.slice(0, -4).forEach((removed) => {
        const timer = timers.current.get(removed.id)
        if (timer) window.clearTimeout(timer)
        timers.current.delete(removed.id)
      })
      return next.slice(-4)
    })
    if (toast.duration > 0) timers.current.set(toast.id, window.setTimeout(() => removeToast(toast.id), toast.duration))
  }, [removeToast])

  const value = useMemo(() => ({ showToast, removeToast }), [removeToast, showToast])
  return <ToastContext.Provider value={value}>
    {children}
    <div className="pointer-events-none fixed inset-x-3 top-3 z-50 flex flex-col items-end gap-3 sm:left-auto sm:right-5 sm:top-5 sm:w-[390px]" aria-live="polite" aria-label="Thông báo">
      {toasts.map((toast) => {
        const item = config[toast.type]
        const Icon = item.icon
        return <article key={toast.id} role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'} aria-atomic="true" className="toast-card pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex items-start gap-3"><Icon className={item.color} size={22} aria-hidden="true" /><div className="min-w-0 flex-1"><h2 className="font-bold text-slate-900">{toast.title ?? item.title}</h2>{toast.message && <p className="mt-1 break-words text-sm text-slate-600">{toast.message}</p>}</div><button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" onClick={() => removeToast(toast.id)} aria-label="Đóng thông báo"><X size={18} /></button></div>
          {toast.duration > 0 && <span className={`toast-progress absolute inset-x-0 bottom-0 h-0.5 ${item.bar}`} style={{ animationDuration: `${toast.duration}ms` }} aria-hidden="true" />}
        </article>
      })}
    </div>
  </ToastContext.Provider>
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
