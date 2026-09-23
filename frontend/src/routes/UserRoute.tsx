import { Navigate, Outlet } from 'react-router-dom'
import { useCurrentUser } from '../hooks/auth/useAuth'

export function UserRoute() {
  const { data } = useCurrentUser()
  return data?.user.role === 'user' ? <Outlet /> : <Navigate to="/forbidden" replace />
}
