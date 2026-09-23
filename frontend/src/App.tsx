import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AppErrorBoundary } from './components/feedback/AppErrorBoundary'
import { setUnauthorizedHandler } from './config/axios'
import { queryClient } from './config/query-client'
import { authKeys } from './hooks/auth/useAuth'
import { ToastProvider } from './contexts/ToastContext'
import { AppRoutes } from './routes/AppRoutes'

export default function App() {
  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.removeQueries({ queryKey: authKeys.me(), exact: true })
      queryClient.removeQueries({ queryKey: ['enrollments'] })
    })
    return () => setUnauthorizedHandler()
  }, [])

  return <AppErrorBoundary><QueryClientProvider client={queryClient}><ToastProvider><BrowserRouter><AppRoutes /></BrowserRouter></ToastProvider></QueryClientProvider></AppErrorBoundary>
}
