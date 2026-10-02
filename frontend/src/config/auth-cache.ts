import { queryClient } from './query-client'
import type { AuthSession } from '../types/auth.types'

export type AuthSessionCache = AuthSession | null

export const authKeys = {
  all: ['auth'] as const,
  me: () => ['auth', 'me'] as const,
}

export const setAuthSession = (session: AuthSession) => {
  queryClient.removeQueries({ queryKey: ['classes', 'detail'] })
  queryClient.setQueryData<AuthSessionCache>(authKeys.me(), session)
}

const isPrivateClassQuery = (queryKey: readonly unknown[]) =>
  queryKey[0] === 'classes' &&
  (queryKey[1] === 'detail' || queryKey[1] === 'admin-list' || queryKey.includes('students'))

export const clearAuthSession = () => {
  queryClient.setQueryData<AuthSessionCache>(authKeys.me(), null)
  queryClient.removeQueries({ predicate: ({ queryKey }) => isPrivateClassQuery(queryKey) })
  queryClient.removeQueries({ queryKey: ['enrollments'] })
}
