import { useMutation, useQuery } from '@tanstack/react-query'
import { queryClient } from '../../config/query-client'
import { classKeys } from '../classes/useClasses'
import { enrollmentService } from '../../services/enrollment.service'
import type { MyEnrollmentParams } from '../../types/enrollment.types'

export const enrollmentKeys = {
  all: ['enrollments'] as const,
  mine: (params: MyEnrollmentParams) => ['enrollments', 'me', params] as const,
}

export const useMyEnrollments = (params: MyEnrollmentParams) => useQuery({
  queryKey: enrollmentKeys.mine(params), queryFn: () => enrollmentService.mine(params), placeholderData: (previous) => previous,
})

const refreshEnrollmentData = (classId: string) => Promise.all([
  queryClient.invalidateQueries({ queryKey: classKeys.detail(classId) }),
  queryClient.invalidateQueries({ queryKey: classKeys.lists() }),
  queryClient.invalidateQueries({ queryKey: enrollmentKeys.all }),
])

export const useEnroll = (classId: string) => useMutation({
  mutationFn: () => enrollmentService.enroll(classId), onSuccess: () => refreshEnrollmentData(classId),
})
export const useCancelEnrollment = (classId: string) => useMutation({
  mutationFn: () => enrollmentService.cancel(classId), onSuccess: () => refreshEnrollmentData(classId),
})
