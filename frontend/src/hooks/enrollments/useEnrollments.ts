import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { classKeys } from '../classes/useClasses'
import { enrollmentService } from '../../services/enrollment.service'
import type { MyEnrollmentParams } from '../../types/enrollment.types'

export const enrollmentKeys = {
  all: ['enrollments'] as const,
  mine: (params: MyEnrollmentParams) => ['enrollments', 'me', params] as const,
}

export const useMyEnrollments = (params: MyEnrollmentParams) =>
  useQuery({
    queryKey: enrollmentKeys.mine(params),
    queryFn: ({ signal }) => enrollmentService.mine(params, signal),
    placeholderData: (previous) => previous,
  })

const refreshEnrollmentData = (queryClient: QueryClient, classId: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: classKeys.detail(classId) }),
    queryClient.invalidateQueries({ queryKey: classKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: enrollmentKeys.all }),
  ])

export const useEnroll = (classId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => enrollmentService.enroll(classId),
    onSuccess: () => refreshEnrollmentData(queryClient, classId),
  })
}

export const useCancelEnrollment = (classId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => enrollmentService.cancel(classId),
    onSuccess: () => refreshEnrollmentData(queryClient, classId),
  })
}
