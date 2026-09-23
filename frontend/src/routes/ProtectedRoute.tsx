import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '../components/feedback/States'
import { useCurrentUser } from '../hooks/auth/useAuth'

export function ProtectedRoute() {
  const auth = useCurrentUser(); const location = useLocation()
  if (auth.isPending) return <div className="mx-auto max-w-3xl p-10"><LoadingState /></div>
  if (!auth.data) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}
