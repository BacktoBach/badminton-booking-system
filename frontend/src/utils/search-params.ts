import { classLevels, type ClassLevel } from '../types/class.types'
import type { EnrollmentStatus } from '../types/enrollment.types'

export const readPositivePage = (value: string | null) => {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

export const readClassLevel = (value: string | null): ClassLevel | undefined =>
  classLevels.includes(value as ClassLevel) ? (value as ClassLevel) : undefined

export const readEnrollmentStatus = (value: string | null): EnrollmentStatus =>
  value === 'past' || value === 'all' || value === 'upcoming' ? value : 'upcoming'
