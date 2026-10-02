import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authKeys, clearAuthSession } from '../../config/auth-cache'
import { setUnauthorizedHandler } from '../../config/axios'
import { queryClient } from '../../config/query-client'
import { useToast } from '../../contexts/ToastContext'
import { useCurrentUser } from '../../hooks/auth/useAuth'
import { parseDate } from '../../utils/date'
import {
  publishAuthSessionEvent,
  subscribeToAuthSessionEvents,
} from '../../utils/auth-session-events'

const isProtectedPath = (pathname: string) =>
  pathname === '/change-password' ||
  pathname === '/my-classes' ||
  pathname.startsWith('/my-classes/') ||
  pathname === '/admin' ||
  pathname.startsWith('/admin/')

export function SessionLifecycle() {
  const { data } = useCurrentUser()
  const { showToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const expirationHandled = useRef(false)

  useEffect(() => {
    if (data) expirationHandled.current = false
  }, [data])

  const expireSession = useCallback(
    (broadcast = true) => {
      if (expirationHandled.current) return
      expirationHandled.current = true
      clearAuthSession()
      if (broadcast) publishAuthSessionEvent('expired')
      showToast({
        type: 'warning',
        title: 'Phiên đăng nhập đã hết hạn',
        message: 'Vui lòng đăng nhập lại để tiếp tục.',
      })
      if (isProtectedPath(location.pathname)) {
        navigate('/login', {
          replace: true,
          state: { from: location.pathname + location.search + location.hash },
        })
      }
    },
    [location.hash, location.pathname, location.search, navigate, showToast],
  )

  useEffect(() => {
    setUnauthorizedHandler(() => expireSession())
    return () => setUnauthorizedHandler()
  }, [expireSession])

  useEffect(
    () =>
      subscribeToAuthSessionEvents((event) => {
        if (event.type === 'login') {
          expirationHandled.current = false
          queryClient.removeQueries({ queryKey: ['classes', 'detail'] })
          void queryClient.invalidateQueries({ queryKey: authKeys.me(), exact: true })
          return
        }
        if (event.type === 'expired') {
          expireSession(false)
          return
        }
        clearAuthSession()
      }),
    [expireSession],
  )

  useEffect(() => {
    const expiresAt = parseDate(data?.session.expiresAt)
    if (!expiresAt) return

    let timer: number | undefined
    const scheduleExpiry = () => {
      const remaining = expiresAt.getTime() - Date.now()
      if (remaining <= 0) {
        expireSession()
        return
      }
      timer = window.setTimeout(scheduleExpiry, Math.min(remaining, 2_147_483_647))
    }
    scheduleExpiry()
    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [data?.session.expiresAt, expireSession])

  return null
}
