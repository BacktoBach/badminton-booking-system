const weekdays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const twoDigits = (value: number) => String(value).padStart(2, '0')

function parseSchedule(value: string) {
  const selectedDays = weekdays.filter((weekday) => value.includes(weekday))
  const time = value.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/)
  return { selectedDays, hour: time?.[1] ?? '19', minute: time?.[2] ?? '00' }
}

type Props = {
  value: string
  onChange: (value: string) => void
  error?: string
}

export function SchedulePicker({ value, onChange, error }: Props) {
  const { selectedDays, hour, minute } = parseSchedule(value)
  const formatSchedule = (days: string[], nextHour = hour, nextMinute = minute) =>
    days.length ? `${days.join(', ')} - ${nextHour}:${nextMinute}` : ''

  return (
    <div className="text-sm font-semibold text-slate-800">
      <span id="schedule-label" className="block">
        Lịch học
      </span>
      <div className="mt-2 rounded-xl border border-slate-300 bg-white p-3">
        <div
          className="grid grid-cols-4 gap-2 sm:grid-cols-7"
          role="group"
          aria-labelledby="schedule-label"
          aria-describedby={error ? 'schedule-error' : undefined}
          aria-invalid={Boolean(error)}
        >
          {weekdays.map((weekday) => {
            const selected = selectedDays.includes(weekday)
            return (
              <button
                key={weekday}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  const nextDays = selected
                    ? selectedDays.filter((day) => day !== weekday)
                    : weekdays.filter((day) => selectedDays.includes(day) || day === weekday)
                  onChange(formatSchedule(nextDays))
                }}
                className={`rounded-lg border px-2 py-2 text-xs transition ${selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-500 hover:bg-emerald-50'}`}
              >
                {weekday}
              </button>
            )
          })}
        </div>
        {value && !selectedDays.length && (
          <p className="mt-2 text-xs font-normal text-amber-700">
            Lịch hiện tại chưa theo định dạng chọn thứ và giờ. Chọn một ngày trong tuần để cập nhật.
          </p>
        )}
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          <span className="mr-1 text-xs font-medium text-slate-600">Giờ học</span>
          <label htmlFor="schedule-hour" className="sr-only">
            Giờ học
          </label>
          <select
            id="schedule-hour"
            value={hour}
            aria-label="Giờ học"
            disabled={!selectedDays.length}
            onChange={(event) => onChange(formatSchedule(selectedDays, event.target.value, minute))}
            className="rounded-lg border border-slate-300 px-2 py-1.5 font-normal disabled:bg-slate-50"
          >
            {Array.from({ length: 24 }, (_, value) => (
              <option key={value} value={twoDigits(value)}>
                {twoDigits(value)}
              </option>
            ))}
          </select>
          <span>:</span>
          <label htmlFor="schedule-minute" className="sr-only">
            Phút học
          </label>
          <select
            id="schedule-minute"
            value={minute}
            aria-label="Phút học"
            disabled={!selectedDays.length}
            onChange={(event) => onChange(formatSchedule(selectedDays, hour, event.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1.5 font-normal disabled:bg-slate-50"
          >
            {Array.from({ length: 60 }, (_, value) => (
              <option key={value} value={twoDigits(value)}>
                {twoDigits(value)}
              </option>
            ))}
          </select>
          <span className="ml-auto text-xs font-normal text-slate-500">giờ VN</span>
        </div>
      </div>
      {error && (
        <p id="schedule-error" className="mt-1 text-xs font-normal text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
