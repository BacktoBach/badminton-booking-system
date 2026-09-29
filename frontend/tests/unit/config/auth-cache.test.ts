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
})
