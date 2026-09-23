import { Trophy } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

export const AuthLayout = () => <main className="grid min-h-screen place-items-center bg-[#f7faf8] p-4"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl"><Link to="/classes" className="mb-7 flex items-center justify-center gap-2 text-2xl font-black"><span className="grid size-11 place-items-center rounded-xl bg-emerald-700 text-white"><Trophy /></span>ShuttleUp</Link><Outlet /></section></main>
