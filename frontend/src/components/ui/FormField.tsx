import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

type BaseProps = { label: string; fieldId: string; error?: string; hint?: string }
export function InputField({
  label,
  fieldId,
  error,
  hint,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`
  const describedBy = error ? errorId : hint ? hintId : undefined
  return (
    <div className="text-sm font-semibold text-slate-800">
      <label className="block" htmlFor={fieldId}>
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        {...props}
      />
      {hint && !error && (
        <span id={hintId} className="mt-1 block text-xs font-normal text-slate-500">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="mt-1 block text-xs font-normal text-rose-600">
          {error}
        </span>
      )}
    </div>
  )
}
export function TextareaField({
  label,
  fieldId,
  error,
  hint,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`
  const describedBy = error ? errorId : hint ? hintId : undefined
  return (
    <div className="text-sm font-semibold text-slate-800">
      <label className="block" htmlFor={fieldId}>
        {label}
      </label>
      <textarea
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        {...props}
      />
      {hint && !error && (
        <span id={hintId} className="mt-1 block text-xs font-normal text-slate-500">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="mt-1 block text-xs font-normal text-rose-600">
          {error}
        </span>
      )}
    </div>
  )
}
export function SelectField({
  label,
  fieldId,
  error,
  hint,
  children,
  ...props
}: BaseProps & React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`
  const describedBy = error ? errorId : hint ? hintId : undefined
  return (
    <div className="text-sm font-semibold text-slate-800">
      <label className="block" htmlFor={fieldId}>
        {label}
      </label>
      <select
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        {...props}
      >
        {children}
      </select>
      {hint && !error && (
        <span id={hintId} className="mt-1 block text-xs font-normal text-slate-500">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="mt-1 block text-xs font-normal text-rose-600">
          {error}
        </span>
      )}
    </div>
  )
}
