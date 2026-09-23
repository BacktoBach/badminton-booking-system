import { CalendarDays, MapPin, UserRound } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatDate } from '../../components/classes/ClassCard'
import { ErrorState, LoadingState } from '../../components/feedback/States'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../contexts/ToastContext'
import { useCurrentUser } from '../../hooks/auth/useAuth'
import { useClassDetail } from '../../hooks/classes/useClasses'
import { useEnroll } from '../../hooks/enrollments/useEnrollments'
import { getErrorMessage } from '../../utils/api-error'

export function ClassDetailPage() {
  const { classId = '' } = useParams(); const query = useClassDetail(classId); const auth = useCurrentUser(); const enroll = useEnroll(classId); const { showToast } = useToast(); const navigate = useNavigate()
  if (query.isPending) return <div className="mx-auto max-w-7xl px-4 py-12"><LoadingState /></div>
  if (query.isError) return <div className="mx-auto max-w-3xl px-4 py-12"><ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} /></div>
  const item = query.data; const started = new Date(item.startDate).getTime() <= Date.now(); const canEnroll = auth.data?.user.role === 'user' && !item.isFull && !started
  const handleEnroll = () => { if (!auth.data) { navigate('/login', { state: { from: `/classes/${classId}` } }); return } enroll.mutate(undefined, { onSuccess: () => showToast('Bạn đã đăng ký lớp học.'), onError: (error) => showToast({ type: 'error', message: getErrorMessage(error) }) }) }
  return <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[1.4fr_.8fr]"><article className="rounded-3xl border bg-white p-7 shadow-sm"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">{item.level}</span><h1 className="mt-5 text-3xl font-black sm:text-4xl">{item.title}</h1><p className="mt-4 whitespace-pre-wrap text-slate-600">{item.description}</p><div className="mt-8 grid gap-5 border-y py-7 sm:grid-cols-2"><p className="flex gap-3"><CalendarDays className="text-emerald-700" /> <span><small className="block text-slate-500">Khai giảng</small><strong>{formatDate(item.startDate)}</strong></span></p><p className="flex gap-3"><UserRound className="text-emerald-700" /> <span><small className="block text-slate-500">Huấn luyện viên</small><strong>{item.coachName}</strong></span></p><p className="flex gap-3"><MapPin className="text-emerald-700" /> <span><small className="block text-slate-500">Địa điểm</small><strong>{item.location}</strong></span></p><p><small className="block text-slate-500">Lịch học</small><strong>{item.schedule}</strong></p></div></article><aside><div className="sticky top-24 rounded-3xl border bg-white p-7 shadow-sm"><p className="font-bold text-emerald-700">{started ? 'Lớp đã bắt đầu' : item.isFull ? 'Lớp đã đủ chỗ' : 'Đang mở đăng ký'}</p><h2 className="mt-2 text-2xl font-black">Giữ chỗ của bạn</h2><div className="mt-5 rounded-xl bg-sky-50 p-5"><strong>{item.currentStudents}/{item.maxStudents} học viên</strong><div className="mt-3 h-2 rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${Math.min(100, item.currentStudents / item.maxStudents * 100)}%` }} /></div><p className="mt-3 text-sm text-slate-600">Còn {item.availableSlots} chỗ</p></div>{auth.data?.user.role === 'admin' ? <Link className="mt-5 block text-center font-bold text-emerald-700" to="/admin/classes">Quản lý lớp</Link> : <Button className="mt-5 w-full" disabled={Boolean(auth.data) && !canEnroll || enroll.isPending} onClick={handleEnroll}>{auth.data ? 'Đăng ký lớp học' : 'Đăng nhập để đăng ký'}</Button>}</div></aside></section>
}
