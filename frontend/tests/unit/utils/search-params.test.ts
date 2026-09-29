import { describe, expect, it } from 'vitest'
import {
  readClassLevel,
  readEnrollmentStatus,
  readPositivePage,
} from '../../../src/utils/search-params'

describe('search param readers', () => {
  it('normalizes invalid pages', () => {
    expect(readPositivePage(null)).toBe(1)
    expect(readPositivePage('-2')).toBe(1)
    expect(readPositivePage('2.5')).toBe(1)
    expect(readPositivePage('3')).toBe(3)
  })

  it('accepts only supported enum values', () => {
    expect(readClassLevel('advanced')).toBe('advanced')
    expect(readClassLevel('expert')).toBeUndefined()
    expect(readEnrollmentStatus('past')).toBe('past')
    expect(readEnrollmentStatus('invalid')).toBe('upcoming')
  })
})
