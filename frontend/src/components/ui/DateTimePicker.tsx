import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { toBusinessDateTimeInput } from '../../utils/date'

type Props = {
  id: string
  labelId: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
}

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const twoDigits = (value: number) => String(value).padStart(2, '0')

export function DateTimePicker({ id, labelId, value, onChange, disabled, error }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [year, month, day] = value ? value.slice(0, 10).split('-').map(Number) : []
  const [viewMonth, setViewMonth] = useState(() => {
    const [currentYear, currentMonth] = toBusinessDateTimeInput(new Date().toISOString())
      .slice(0, 10)
      .split('-')
      .map(Number)
    return new Date(Date.UTC(year ?? currentYear, (month ?? currentMonth) - 1, 1))
  })
  const selectedHour = value ? value.slice(11, 13) : '19'
  const selectedMinute = value ? value.slice(14, 16) : '00'

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const firstWeekday = (viewMonth.getUTCDay() + 6) % 7
  const daysInMonth = new Date(
    Date.UTC(viewMonth.getUTCFullYear(), viewMonth.getUTCMonth() + 1, 0),
  ).getUTCDate()
  const monthLabel = new Intl.DateTimeFormat('vi-VN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(viewMonth)
  const selectedDate = value.slice(0, 10)
  const updateMonth = (offset: number) =>
    setViewMonth(
      new Date(Date.UTC(viewMonth.getUTCFullYear(), viewMonth.getUTCMonth() + offset, 1)),
    )

  return (
    <div ref={root} className="relative text-sm">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-labelledby={labelId}
        aria-controls={`${id}-picker`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-3 text-left font-normal outline-none transition hover:border-emerald-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
      >
        <CalendarDays size={19} className="shrink-0 text-emerald-700" aria-hidden="true" />
        <span className={value ? 'text-slate-900' : 'text-slate-500'}>
          {value
            ? `${twoDigits(day!)} / ${twoDigits(month!)} / ${year} · ${selectedHour}:${selectedMinute}`
            : 'Chọn ngày và giờ'}
        </span>
      </button>
      {open && (
        <div
          id={`${id}-picker`}
          className="absolute left-0 top-full z-20 mt-2 w-full min-w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:w-80"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Tháng trước"
              onClick={() => updateMonth(-1)}
              className="rounded-lg p-2 hover:bg-slate-100"
            >
              <ChevronLeft size={18} />
            </button>
            <span
              data-testid={`${id}-month`}
              data-month={`${viewMonth.getUTCFullYear()}-${twoDigits(viewMonth.getUTCMonth() + 1)}`}
              className="font-semibold capitalize"
            >
              {monthLabel}
            </span>
            <button
              type="button"
              aria-label="Tháng sau"
              onClick={() => updateMonth(1)}
              className="rounded-lg p-2 hover:bg-slate-100"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center">
            {weekDays.map((weekday) => (
              <span key={weekday} className="py-2 text-xs text-slate-500">
                {weekday}
              </span>
            ))}
            {Array.from({ length: firstWeekday }, (_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const date = `${viewMonth.getUTCFullYear()}-${twoDigits(viewMonth.getUTCMonth() + 1)}-${twoDigits(index + 1)}`
              return (
                <button
                  key={date}
                  type="button"
                  aria-label={`Chọn ngày ${index + 1}/${viewMonth.getUTCMonth() + 1}/${viewMonth.getUTCFullYear()}`}
                  aria-pressed={selectedDate === date}
                  onClick={() => onChange(`${date}T${selectedHour}:${selectedMinute}`)}
                  className={`rounded-lg py-2 hover:bg-emerald-50 ${selectedDate === date ? 'bg-emerald-600 font-semibold text-white hover:bg-emerald-700' : ''}`}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-slate-200 pt-4">
            <Clock3 size={18} className="text-emerald-700" aria-hidden="true" />
            <label htmlFor={`${id}-hour`} className="sr-only">
              Giờ
            </label>
            <select
              id={`${id}-hour`}
              value={selectedHour}
              onChange={(event) =>
                value && onChange(`${selectedDate}T${event.target.value}:${selectedMinute}`)
              }
              className="rounded-lg border border-slate-300 px-2 py-1.5"
              disabled={!value}
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={twoDigits(hour)}>
                  {twoDigits(hour)}
                </option>
              ))}
            </select>
            <span>:</span>
            <label htmlFor={`${id}-minute`} className="sr-only">
              Phút
            </label>
            <select
              id={`${id}-minute`}
              value={selectedMinute}
              onChange={(event) =>
                value && onChange(`${selectedDate}T${selectedHour}:${event.target.value}`)
              }
              className="rounded-lg border border-slate-300 px-2 py-1.5"
              disabled={!value}
            >
              {Array.from({ length: 60 }, (_, minute) => (
                <option key={minute} value={twoDigits(minute)}>
                  {twoDigits(minute)}
                </option>
              ))}
            </select>
            <span className="ml-auto text-xs text-slate-500">giờ VN</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 w-full rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700"
          >
            Xong
          </button>
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
