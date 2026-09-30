import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AppErrorBoundary } from './components/feedback/AppErrorBoundary'
import { SessionLifecycle } from './components/auth/SessionLifecycle'
import { setUnauthorizedHandler } from './config/axios'
import { queryClient } from './config/query-client'
import { authKeys, clearAuthSession } from './config/auth-cache'
import { publishAuthSessionEvent, subscribeToAuthSessionEvents } from './utils/auth-session-events'
import { ToastProvider } from './contexts/ToastContext'
import { AppRoutes } from './routes/AppRoutes'

export default function App() {
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuthSession()
      publishAuthSessionEvent('expired')
    })
    const unsubscribe = subscribeToAuthSessionEvents((event) => {
      if (event.type === 'login') {
        queryClient.removeQueries({ queryKey: ['classes', 'detail'] })
        void queryClient.invalidateQueries({ queryKey: authKeys.me(), exact: true })
        return
      }
      clearAuthSession()
    })
    return () => {
      unsubscribe()
      setUnauthorizedHandler()
    }
  }, [])

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <SessionLifecycle />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  )
}
