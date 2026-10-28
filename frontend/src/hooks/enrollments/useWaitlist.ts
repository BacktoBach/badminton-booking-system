import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { classKeys } from '../classes/useClasses'
import { waitlistService } from '../../services/waitlist.service'
import { enrollmentKeys } from './useEnrollments'

export const waitlistKeys = {
  all: ['waitlist'] as const,
  mine: () => ['waitlist', 'me'] as const,
  forClass: (id: string) => ['waitlist', 'class', id] as const,
}

export const useMyWaitlist = () =>
  useQuery({
    queryKey: waitlistKeys.mine(),
    queryFn: ({ signal }) => waitlistService.mine(signal),
    refetchInterval: 30_000,
  })

export const useClassWaitlist = (classId: string, enabled: boolean) =>
  useQuery({
    queryKey: waitlistKeys.forClass(classId),
    queryFn: ({ signal }) => waitlistService.forClass(classId, signal),
    enabled: Boolean(classId) && enabled,
    refetchInterval: enabled ? 30_000 : false,
  })

const refreshWaitlist = (queryClient: ReturnType<typeof useQueryClient>, classId?: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: waitlistKeys.all }),
    queryClient.invalidateQueries({ queryKey: classKeys.lists() }),
    ...(classId
      ? [queryClient.invalidateQueries({ queryKey: waitlistKeys.forClass(classId) })]
      : []),
  ])

export const useJoinWaitlist = (classId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => waitlistService.join(classId),
    onSettled: () => refreshWaitlist(queryClient, classId),
  })
}

export const useLeaveWaitlist = (classId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => waitlistService.leave(classId),
    onSettled: () => refreshWaitlist(queryClient, classId),
  })
}

export const useAcceptWaitlistOffer = (classId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => waitlistService.accept(classId),
    onSettled: () => refreshWaitlist(queryClient, classId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: enrollmentKeys.all })
      await queryClient.invalidateQueries({ queryKey: classKeys.detail(classId) })
    },
  })
}
