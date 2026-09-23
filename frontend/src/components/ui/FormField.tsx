import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

type BaseProps = { label: string; fieldId: string; error?: string; hint?: string }
export function InputField({ label, fieldId, error, hint, ...props }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const errorId = `${fieldId}-error`
  return <label className="block text-sm font-semibold text-slate-800" htmlFor={fieldId}>{label}<input id={fieldId} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" {...props} />{hint && !error && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}{error && <span id={errorId} className="mt-1 block text-xs font-normal text-rose-600">{error}</span>}</label>
}
export function TextareaField({ label, fieldId, error, ...props }: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <label className="block text-sm font-semibold text-slate-800" htmlFor={fieldId}>{label}<textarea id={fieldId} aria-invalid={Boolean(error)} className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" {...props} />{error && <span className="mt-1 block text-xs font-normal text-rose-600">{error}</span>}</label>
}
export function SelectField({ label, fieldId, error, children, ...props }: BaseProps & React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-800" htmlFor={fieldId}>{label}<select id={fieldId} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" {...props}>{children}</select>{error && <span className="mt-1 block text-xs font-normal text-rose-600">{error}</span>}</label>
}
