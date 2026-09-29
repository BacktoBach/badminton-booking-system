import { useEffect } from 'react'
import { clearAuthSession } from '../../config/auth-cache'
import { useToast } from '../../contexts/ToastContext'
import { useCurrentUser } from '../../hooks/auth/useAuth'
import { parseDate } from '../../utils/date'
import { publishAuthSessionEvent } from '../../utils/auth-session-events'

export function SessionLifecycle() {
  const { data } = useCurrentUser()
  const { showToast } = useToast()

  useEffect(() => {
    const expiresAt = parseDate(data?.session.expiresAt)
    if (!expiresAt) return

    const expireSession = () => {
      clearAuthSession()
      publishAuthSessionEvent('expired')
      showToast({
        type: 'warning',
        title: 'Phiên đăng nhập đã hết hạn',
        message: 'Vui lòng đăng nhập lại để tiếp tục.',
      })
    }

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
  }, [data?.session.expiresAt, showToast])

  return null
}
