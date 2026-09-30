export const BUSINESS_TIME_ZONE = 'Asia/Ho_Chi_Minh'
export const BUSINESS_TIME_ZONE_LABEL = 'giờ VN'

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: BUSINESS_TIME_ZONE,
})

const inputDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const BUSINESS_UTC_OFFSET = '+07:00'

export const parseDate = (value: string | null | undefined) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDateTime = (value: string | null | undefined, fallback = '—') => {
  const date = parseDate(value)
  return date ? `${dateTimeFormatter.format(date)} (${BUSINESS_TIME_ZONE_LABEL})` : fallback
}

export const toBusinessDateTimeInput = (value: string | null | undefined) => {
  const date = parseDate(value)
  if (!date) return ''

  const parts = Object.fromEntries(
    inputDateTimeFormatter
      .formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value: partValue }) => [type, partValue]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export const parseBusinessDateTimeInput = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null

  const date = parseDate(`${value}:00${BUSINESS_UTC_OFFSET}`)
  return date && toBusinessDateTimeInput(date.toISOString()) === value ? date : null
}

export const businessDateTimeInputToIso = (value: string) => {
  const date = parseBusinessDateTimeInput(value)
  if (!date) throw new RangeError('Invalid business date and time')
  return date.toISOString()
}

export const hasStarted = (value: string) => {
  const date = parseDate(value)
  return date ? date.getTime() <= Date.now() : false
}
