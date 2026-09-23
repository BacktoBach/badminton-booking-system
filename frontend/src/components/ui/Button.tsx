import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }
export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const variants = { primary: 'bg-emerald-700 text-white hover:bg-emerald-800', secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50', danger: 'bg-rose-600 text-white hover:bg-rose-700' }
  return <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${variants[variant]} ${className}`} {...props} />
}
