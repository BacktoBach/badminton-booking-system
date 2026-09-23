import { LogOut, Trophy } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useCurrentUser, useLogout } from '../hooks/auth/useAuth'
import { useToast } from '../contexts/ToastContext'

export function MainLayout() {
  const { data } = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const handleLogout = () => logout.mutate(undefined, { onSuccess: () => { showToast('Đã đăng xuất.'); navigate('/login') } })
  const navClass = ({ isActive }: { isActive: boolean }) => `font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`
  return <div className="min-h-screen bg-[#f7faf8] text-slate-900"><header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex min-h-16 max-w-7xl items-center gap-6 px-4"><Link to="/classes" className="flex items-center gap-2 text-xl font-black"><span className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white"><Trophy size={21} /></span>ShuttleUp</Link><nav className="flex flex-1 items-center gap-5"><NavLink className={navClass} to="/classes">Lớp học</NavLink>{data?.user.role === 'user' && <NavLink className={navClass} to="/my-classes">Lớp của tôi</NavLink>}{data?.user.role === 'admin' && <NavLink className={navClass} to="/admin/classes">Quản trị</NavLink>}</nav>{data ? <div className="flex items-center gap-3"><span className="hidden text-sm sm:inline"><strong>{data.user.name}</strong><small className="block text-emerald-700">{data.user.role === 'admin' ? 'Quản trị viên' : 'Học viên'}</small></span><button onClick={handleLogout} className="rounded-xl border border-slate-200 p-2" aria-label="Đăng xuất"><LogOut size={20} /></button></div> : <Link className="font-bold text-emerald-700" to="/login">Đăng nhập</Link>}</div></header><main><Outlet /></main><footer className="mt-16 border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl justify-between px-4 py-8 text-sm text-slate-500"><span>© 2026 ShuttleUp</span><span>Học đúng lớp. Chơi đúng trình.</span></div></footer></div>
}
