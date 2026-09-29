import { ChevronDown, KeyRound, LogOut, Trophy, UserRound } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useCurrentUser, useLogout } from '../hooks/auth/useAuth'
import { useToast } from '../contexts/ToastContext'
import { getErrorMessage } from '../utils/api-error'

export function MainLayout() {
  const { data } = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const handleLogout = () =>
    logout.mutate(undefined, {
      onSuccess: () => {
        showToast('Đã đăng xuất.')
        navigate('/login')
      },
      onError: (error) => showToast({ type: 'error', message: getErrorMessage(error) }),
    })
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`
  return (
    <div className="min-h-screen bg-[#f7faf8] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-6 px-4">
          <Link to="/classes" className="flex shrink-0 items-center gap-2 text-xl font-black">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white">
              <Trophy size={21} />
            </span>
            <span className="hidden sm:inline">ShuttleUp</span>
          </Link>
          <nav className="flex flex-1 items-center gap-5 overflow-x-auto text-sm">
            <NavLink className={navClass} to="/classes">
              Lớp học
            </NavLink>
            {data?.user.role === 'user' && (
              <NavLink className={navClass} to="/my-classes">
                Lớp của tôi
              </NavLink>
            )}
            {data?.user.role === 'admin' && (
              <NavLink className={navClass} to="/admin/classes">
                Quản trị
              </NavLink>
            )}
          </nav>
          {data ? (
            <details className="group relative shrink-0">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 [&::-webkit-details-marker]:hidden">
                <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                  <UserRound size={17} />
                </span>
                <span className="hidden max-w-36 text-left sm:block">
                  <strong className="block truncate">{data.user.name}</strong>
                  <small className="block text-emerald-700">
                    {data.user.role === 'admin' ? 'Quản trị viên' : 'Học viên'}
                  </small>
                </span>
                <ChevronDown
                  className="transition group-open:rotate-180"
                  size={16}
                  aria-hidden="true"
                />
              </summary>
              <div className="absolute right-0 top-[calc(100%+.5rem)] w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <Link
                  to="/change-password"
                  className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  <KeyRound size={17} /> Đổi mật khẩu
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={logout.isPending}
                  className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                >
                  <LogOut size={17} /> {logout.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
                </button>
              </div>
            </details>
          ) : (
            <Link className="shrink-0 font-bold text-emerald-700" to="/login">
              Đăng nhập
            </Link>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl justify-between px-4 py-8 text-sm text-slate-500">
          <span>© 2026 ShuttleUp</span>
          <span>Học đúng lớp. Chơi đúng trình.</span>
        </div>
      </footer>
    </div>
  )
}
