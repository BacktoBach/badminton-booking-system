import type { UserRole } from '../types/auth.types'

const defaultPathByRole: Record<UserRole, string> = {
  admin: '/admin/classes',
  user: '/classes',
}

const authWorkflowPaths = new Set([
  '/login',
  '/register',
  '/change-password',
  '/forgot-password',
  '/reset-password',
])

const isRouteForRole = (pathname: string, role: UserRole) => {
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  const isUserRoute = pathname === '/my-classes' || pathname.startsWith('/my-classes/')

  if (isAdminRoute) return role === 'admin'
  if (isUserRoute) return role === 'user'
  return true
}

export const getPostLoginPath = (role: UserRole, requested?: string) => {
  const fallback = defaultPathByRole[role]
  if (!requested || !requested.startsWith('/') || requested.startsWith('//')) return fallback

  const pathname = requested.split(/[?#]/, 1)[0]
  if (authWorkflowPaths.has(pathname)) return fallback
  return isRouteForRole(pathname, role) ? requested : fallback
}
