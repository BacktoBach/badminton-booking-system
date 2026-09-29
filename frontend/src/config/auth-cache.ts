import { queryClient } from './query-client'
import type { AuthSession } from '../types/auth.types'

export type AuthSessionCache = AuthSession | null

export const authKeys = {
  all: ['auth'] as const,
  me: () => ['auth', 'me'] as const,
}

export const setAuthSession = (session: AuthSession) => {
  queryClient.setQueryData<AuthSessionCache>(authKeys.me(), session)
}

export const clearAuthSession = () => {
  queryClient.setQueryData<AuthSessionCache>(authKeys.me(), null)
  queryClient.removeQueries({ queryKey: ['enrollments'] })
}
