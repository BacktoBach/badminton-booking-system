import { useSearchParams } from 'react-router-dom'
import { ClassCard } from '../../components/classes/ClassCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../contexts/ToastContext'
import { useCancelEnrollment, useMyEnrollments } from '../../hooks/enrollments/useEnrollments'
import type { EnrollmentStatus } from '../../types/enrollment.types'
import { getErrorMessage } from '../../utils/api-error'

function EnrollmentItem({ item }: { item: Parameters<typeof ClassCard>[0]['item'] }) {
  const cancel = useCancelEnrollment(item.id); const { showToast } = useToast(); const started = new Date(item.startDate).getTime() <= Date.now()
  const handleCancel = () => { if (!window.confirm(`Hủy đăng ký lớp “${item.title}”?`)) return; cancel.mutate(undefined, { onSuccess: () => showToast('Đã hủy đăng ký lớp.'), onError: (error) => showToast({ type: 'error', message: getErrorMessage(error) }) }) }
  return <div><ClassCard item={item} />{!started && <Button variant="secondary" className="mt-2 w-full" disabled={cancel.isPending} onClick={handleCancel}>Hủy đăng ký</Button>}</div>
}

export function MyClassesPage() {
  const [params, setParams] = useSearchParams(); const status = (params.get('status') ?? 'upcoming') as EnrollmentStatus; const page = Math.max(1, Number(params.get('page')) || 1); const query = useMyEnrollments({ status, page, limit: 9 })
  const update = (key: string, value: string) => setParams((current) => { current.set(key, value); if (key === 'status') current.set('page', '1'); return current })
  return <section className="mx-auto max-w-7xl px-4 py-12"><h1 className="text-3xl font-black">Lớp của tôi</h1><div className="mt-5 flex gap-2">{(['upcoming', 'past', 'all'] as const).map((value) => <button key={value} onClick={() => update('status', value)} className={`rounded-full px-4 py-2 font-semibold ${status === value ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600'}`}>{value === 'upcoming' ? 'Sắp học' : value === 'past' ? 'Đã qua' : 'Tất cả'}</button>)}</div><div className="mt-7">{query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={getErrorMessage(query.error)} /> : query.data.data.length === 0 ? <EmptyState title="Bạn chưa có lớp phù hợp" /> : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{query.data.data.map((item) => <EnrollmentItem key={item.id} item={item} />)}</div>}{query.data && <Pagination page={query.data.meta.page} totalPages={query.data.meta.totalPages} onPageChange={(value) => update('page', String(value))} />}</div></section>
}
