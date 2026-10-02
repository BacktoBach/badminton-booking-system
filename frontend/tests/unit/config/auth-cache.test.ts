import { QueryObserver } from '@tanstack/react-query'
import { afterEach, describe, expect, it } from 'vitest'
import {
  authKeys,
  clearAuthSession,
  setAuthSession,
  type AuthSessionCache,
} from '../../../src/config/auth-cache'
import { queryClient } from '../../../src/config/query-client'
import type { AuthSession } from '../../../src/types/auth.types'

const session: AuthSession = {
  user: { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'user' },
  session: { expiresAt: '2030-01-01T00:00:00.000Z' },
}

describe('auth cache', () => {
  afterEach(() => queryClient.clear())

  it('notifies an active observer when the session is cleared', () => {
    const observer = new QueryObserver<AuthSessionCache>(queryClient, {
      queryKey: authKeys.me(),
      queryFn: async () => session,
      enabled: false,
    })
    let observedData = observer.getCurrentResult().data
    const unsubscribe = observer.subscribe((result) => {
      observedData = result.data
    })

    setAuthSession(session)
    expect(observedData).toEqual(session)

    clearAuthSession()
    expect(observedData).toBeNull()

    unsubscribe()
  })

  it('removes private and user-specific data while preserving public class lists', () => {
    const publicListKey = ['classes', 'list', { page: 1 }] as const
    const adminListKey = ['classes', 'admin-list', { page: 1 }] as const
    const detailKey = ['classes', 'detail', 'class-1'] as const
    const studentsKey = ['classes', 'class-1', 'students', { page: 1 }] as const
    const enrollmentsKey = ['enrollments', 'mine', { page: 1 }] as const

    queryClient.setQueryData(publicListKey, { data: ['public-class'] })
    queryClient.setQueryData(adminListKey, { data: ['admin-class'] })
    queryClient.setQueryData(detailKey, { id: 'class-1', isEnrolled: true })
    queryClient.setQueryData(studentsKey, {
      data: [{ name: 'Student', email: 'student@example.com' }],
    })
    queryClient.setQueryData(enrollmentsKey, { data: ['enrollment'] })

    clearAuthSession()

    expect(queryClient.getQueryData(publicListKey)).toEqual({ data: ['public-class'] })
    expect(queryClient.getQueryData(adminListKey)).toBeUndefined()
    expect(queryClient.getQueryData(detailKey)).toBeUndefined()
    expect(queryClient.getQueryData(studentsKey)).toBeUndefined()
    expect(queryClient.getQueryData(enrollmentsKey)).toBeUndefined()
    expect(queryClient.getQueryData(authKeys.me())).toBeNull()
  })
})
