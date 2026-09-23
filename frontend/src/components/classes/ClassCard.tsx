import { CalendarDays, MapPin, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { BadmintonClass, ClassLevel } from '../../types/class.types'

const levelLabels: Record<ClassLevel, string> = { beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' }
export const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export function ClassCard({ item }: { item: BadmintonClass }) {
  const progress = Math.min(100, (item.currentStudents / item.maxStudents) * 100)
  const started = new Date(item.startDate).getTime() <= Date.now()
  return <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between gap-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">{levelLabels[item.level]}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.isFull ? 'bg-rose-50 text-rose-700' : started ? 'bg-slate-100 text-slate-600' : 'bg-lime-100 text-lime-800'}`}>{item.isFull ? 'Đã đầy' : started ? 'Đã bắt đầu' : `Còn ${item.availableSlots} chỗ`}</span></div>
    <h2 className="mt-4 text-xl font-extrabold text-slate-950">{item.title}</h2><p className="mt-2 text-sm text-slate-600">HLV {item.coachName}</p>
    <div className="mt-4 space-y-2 rounded-xl bg-sky-50 p-4 text-sm text-slate-700"><p className="flex gap-2"><CalendarDays size={18} className="text-emerald-700" />{formatDate(item.startDate)}</p><p className="flex gap-2"><MapPin size={18} className="text-emerald-700" />{item.location}</p><p className="flex gap-2"><Users size={18} className="text-emerald-700" />{item.currentStudents}/{item.maxStudents} học viên</p></div>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${progress}%` }} /></div>
    <Link className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-4 font-bold text-white hover:bg-emerald-800" to={`/classes/${item.id}`}>Xem chi tiết</Link>
  </article>
}
