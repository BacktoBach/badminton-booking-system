import { describe, expect, it } from 'vitest'
import { formatDateTime, hasStarted, parseDate } from '../../../src/utils/date'

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
})
