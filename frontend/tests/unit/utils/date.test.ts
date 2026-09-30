import { describe, expect, it } from 'vitest'
import {
  businessDateTimeInputToIso,
  formatDateTime,
  hasStarted,
  parseBusinessDateTimeInput,
  parseDate,
  toBusinessDateTimeInput,
} from '../../../src/utils/date'

describe('date helpers', () => {
  it('returns safe fallbacks for invalid values', () => {
    expect(parseDate('not-a-date')).toBeNull()
    expect(formatDateTime('not-a-date')).toBe('—')
    expect(hasStarted('not-a-date')).toBe(false)
  })

  it('detects past and future dates', () => {
    expect(hasStarted('2000-01-01T00:00:00.000Z')).toBe(true)
    expect(hasStarted('2999-01-01T00:00:00.000Z')).toBe(false)
  })

  it('converts between Vietnam business time and UTC consistently', () => {
    expect(businessDateTimeInputToIso('2030-05-10T19:30')).toBe('2030-05-10T12:30:00.000Z')
    expect(toBusinessDateTimeInput('2030-05-10T12:30:00.000Z')).toBe('2030-05-10T19:30')
    expect(formatDateTime('2030-05-10T12:30:00.000Z')).toMatch(/19:30.*giờ VN/)
  })

  it('rejects invalid business date-time input', () => {
    expect(parseBusinessDateTimeInput('2030-02-30T19:30')).toBeNull()
    expect(() => businessDateTimeInputToIso('invalid')).toThrow(RangeError)
  })
})
