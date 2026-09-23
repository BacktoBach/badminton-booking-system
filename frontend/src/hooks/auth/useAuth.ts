import { useMutation, useQuery } from '@tanstack/react-query'
import { queryClient } from '../../config/query-client'
import { authService } from '../../services/auth.service'

export const authKeys = { all: ['auth'] as const, me: () => ['auth', 'me'] as const }

export const useCurrentUser = () => useQuery({
  queryKey: authKeys.me(),
  queryFn: authService.me,
  retry: false,
})

export const useLogin = () => useMutation({
  mutationFn: authService.login,
  onSuccess: (session) => queryClient.setQueryData(authKeys.me(), session),
})

export const useRegister = () => useMutation({ mutationFn: authService.register })

export const useLogout = () => useMutation({
  mutationFn: authService.logout,
  onSettled: () => {
    queryClient.removeQueries({ queryKey: authKeys.me(), exact: true })
    queryClient.removeQueries({ queryKey: ['enrollments'] })
  },
})

export const useChangePassword = () => useMutation({
  mutationFn: authService.changePassword,
  onSuccess: () => queryClient.removeQueries({ queryKey: authKeys.me(), exact: true }),
})
