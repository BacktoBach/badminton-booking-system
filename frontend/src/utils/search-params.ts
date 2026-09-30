import { classLevels, type ClassLevel } from '../types/class.types'
import type { EnrollmentStatus } from '../types/enrollment.types'

export const SEARCH_MAX_LENGTH = 100

export const readSearch = (value: string | null) => value?.trim().slice(0, SEARCH_MAX_LENGTH) ?? ''

export const readPositivePage = (value: string | null) => {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

export const readClassLevel = (value: string | null): ClassLevel | undefined =>
  classLevels.includes(value as ClassLevel) ? (value as ClassLevel) : undefined

export const readEnrollmentStatus = (value: string | null): EnrollmentStatus =>
  value === 'past' || value === 'all' || value === 'upcoming' ? value : 'upcoming'
