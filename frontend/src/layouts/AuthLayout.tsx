import { BadgeCheck, Clock3, Trophy } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

export const AuthLayout = () => (
  <div className="min-h-screen bg-[#f3f8fa] text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-5">
        <Link to="/classes" className="flex items-center gap-2 text-xl font-black">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white">
            <Trophy size={21} />
          </span>
          ShuttleUp
        </Link>
      </div>
    </header>

    <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl place-items-center px-4 py-8 sm:px-6 lg:py-12">
      <section className="grid w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)] lg:grid-cols-[1.08fr_.92fr]">
        <div className="flex flex-col px-6 py-8 sm:px-10 lg:px-12 lg:py-11">
          <div className="flex-1">
            <Outlet />
          </div>
          <div className="mt-8 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck size={14} /> Xác thực an toàn bằng HTTP-only cookie
            </span>
          </div>
        </div>

        <aside className="relative isolate hidden min-h-[520px] flex-col overflow-hidden bg-[#006b4c] px-9 py-10 text-white lg:flex">
          <div aria-hidden="true" className="absolute inset-6 border border-emerald-300/20">
            <div className="absolute inset-x-0 top-1/2 border-t border-emerald-200/15" />
          </div>
          <div className="relative my-auto text-center">
            <div className="mx-auto mb-6 grid size-20 place-items-center rounded-full border-[3px] border-lime-400 bg-emerald-950/20 text-lime-300">
              <Trophy size={35} strokeWidth={1.6} />
            </div>
            <h2 className="text-3xl font-bold leading-tight">
              <span className="font-serif">Từng buổi tập nhỏ.</span>
              <br />
              <span className="text-lime-300">Một phiên bản tốt hơn.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-emerald-50/85">
              Tìm lớp đúng trình độ, đúng lịch và theo dõi số chỗ còn lại ngay trên một nền tảng.
            </p>
            <div className="mx-auto mt-8 max-w-sm space-y-3 rounded-xl border border-white/15 bg-emerald-950/20 p-4 text-left text-sm">
              <p className="flex items-center gap-2.5">
                <Trophy className="shrink-0 text-lime-300" size={17} /> Lớp học từ cơ bản đến nâng
                cao
              </p>
              <p className="flex items-center gap-2.5">
                <BadgeCheck className="shrink-0 text-lime-300" size={17} /> Số chỗ được cập nhật từ
                hệ thống
              </p>
              <p className="flex items-center gap-2.5">
                <Clock3 className="shrink-0 text-lime-300" size={17} /> Đăng ký nhanh và quản lý
                thuận tiện
              </p>
            </div>
          </div>
          <p className="relative border-t border-emerald-200/20 pt-3 text-center text-xs font-semibold text-emerald-50/80">
            Học đúng lớp. Chơi đúng trình.
          </p>
        </aside>
      </section>
    </main>
  </div>
)
