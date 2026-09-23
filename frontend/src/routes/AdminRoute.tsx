import { Navigate, Outlet } from 'react-router-dom'
import { useCurrentUser } from '../hooks/auth/useAuth'

export function AdminRoute() {
  const { data } = useCurrentUser()
  return data?.user.role === 'admin' ? <Outlet /> : <Navigate to="/forbidden" replace />
}
