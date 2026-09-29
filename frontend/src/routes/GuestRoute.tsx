import { Navigate, Outlet } from 'react-router-dom'
import { LoadingState } from '../components/feedback/States'
import { useCurrentUser } from '../hooks/auth/useAuth'

export function GuestRoute() {
  const auth = useCurrentUser()
  if (auth.isPending)
    return (
      <div className="mx-auto max-w-3xl p-10">
        <LoadingState />
      </div>
    )
  if (!auth.data) return <Outlet />
  return <Navigate to={auth.data.user.role === 'admin' ? '/admin/classes' : '/classes'} replace />
}
