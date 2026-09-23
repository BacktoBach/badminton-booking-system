import type { BadmintonClass } from './class.types'

export type EnrollmentStatus = 'upcoming' | 'past' | 'all'
export type EnrolledClass = BadmintonClass & { enrolledAt: string }
export type MyEnrollmentParams = { page?: number; limit?: number; status?: EnrollmentStatus }
