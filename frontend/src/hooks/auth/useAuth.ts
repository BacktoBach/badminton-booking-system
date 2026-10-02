import { useMutation, useQuery } from '@tanstack/react-query'
import {
  authKeys,
  clearAuthSession,
  setAuthSession,
  type AuthSessionCache,
} from '../../config/auth-cache'
import { authService } from '../../services/auth.service'
import { publishAuthSessionEvent } from '../../utils/auth-session-events'

export { authKeys }

export const useCurrentUser = () =>
  useQuery<AuthSessionCache>({
    queryKey: authKeys.me(),
    queryFn: ({ signal }) => authService.me(signal),
  })

export const useLogin = () =>
  useMutation({
    mutationFn: authService.login,
    onSuccess: (session) => {
      setAuthSession(session)
      publishAuthSessionEvent('login')
    },
  })

export const useRegister = () => useMutation({ mutationFn: authService.register })

export const useLogout = () =>
  useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      clearAuthSession()
      publishAuthSessionEvent('logout')
    },
  })

export const useChangePassword = () =>
  useMutation({
    mutationFn: authService.changePassword,
    onSuccess: () => {
      clearAuthSession()
      publishAuthSessionEvent('password-changed')
    },
  })
