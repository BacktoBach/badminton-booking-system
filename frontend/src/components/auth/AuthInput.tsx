import { Eye, EyeOff, type LucideIcon } from 'lucide-react'
import { forwardRef, useState, type InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  fieldId: string
  error?: string
  icon: LucideIcon
}

export const AuthInput = forwardRef<HTMLInputElement, Props>(function AuthInput(
  { label, fieldId, error, icon: Icon, type = 'text', ...props },
  ref,
) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const errorId = `${fieldId}-error`

  return (
    <div className="block text-sm font-semibold text-slate-800">
      <label htmlFor={fieldId}>{label}</label>
      <span className="relative mt-2 block">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          size={17}
        />
        <input
          {...props}
          ref={ref}
          id={fieldId}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="min-h-12 w-full rounded-lg border border-slate-200 bg-[#f0f7fc] py-3 pl-10 pr-11 font-normal outline-none transition placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
        />
        {isPassword && (
          <button
            type="button"
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-white hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </span>
      {error && (
        <span id={errorId} className="mt-1 block text-xs font-normal text-rose-600">
          {error}
        </span>
      )}
    </div>
  )
})
