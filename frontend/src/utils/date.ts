const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export const parseDate = (value: string | null | undefined) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDateTime = (value: string | null | undefined, fallback = '—') => {
  const date = parseDate(value)
  return date ? dateTimeFormatter.format(date) : fallback
}

export const hasStarted = (value: string) => {
  const date = parseDate(value)
  return date ? date.getTime() <= Date.now() : false
}
