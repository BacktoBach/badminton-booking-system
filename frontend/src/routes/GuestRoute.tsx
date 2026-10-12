import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/feedback/States'
import { useCurrentUser } from '../hooks/auth/useAuth'
import { getErrorMessage } from '../utils/api-error'
import { getPostLoginPath } from '../utils/post-login-redirect'

export function GuestRoute() {
  const auth = useCurrentUser()
  const location = useLocation()
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
  const requested = (location.state as { from?: string } | null)?.from
  return <Navigate to={getPostLoginPath(auth.data.user.role, requested)} replace />
}
