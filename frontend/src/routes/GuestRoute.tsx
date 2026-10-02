import { Navigate, Outlet } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/States'
import { useCurrentUser } from '../hooks/auth/useAuth'
import { getErrorMessage } from '../utils/api-error'

export function GuestRoute() {
  const auth = useCurrentUser()
  if (auth.isPending)
    return (
      <div className="mx-auto max-w-3xl p-10">
        <LoadingState />
      </div>
    )
  if (auth.isError && !auth.data)
    return (
      <div className="mx-auto max-w-3xl p-10">
        <ErrorState message={getErrorMessage(auth.error)} onRetry={() => auth.refetch()} />
      </div>
    )
  if (!auth.data) return <Outlet />
  return <Navigate to={auth.data.user.role === 'admin' ? '/admin/classes' : '/classes'} replace />
}
