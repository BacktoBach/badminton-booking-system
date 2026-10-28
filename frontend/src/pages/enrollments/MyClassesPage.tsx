import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ClassCard } from '../../components/classes/ClassCard'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  UpdatingContent,
} from '../../components/feedback/States'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../contexts/ToastContext'
import { useCancelEnrollment, useMyEnrollments } from '../../hooks/enrollments/useEnrollments'
import {
  useAcceptWaitlistOffer,
  useLeaveWaitlist,
  useMyWaitlist,
} from '../../hooks/enrollments/useWaitlist'
import { usePaginationBounds } from '../../hooks/usePaginationBounds'
import { getErrorMessage } from '../../utils/api-error'
import { canCancelEnrollment } from '../../utils/date'
import { readEnrollmentStatus, readPositivePage } from '../../utils/search-params'
import type { WaitlistEntry } from '../../services/waitlist.service'

function EnrollmentItem({ item }: { item: Parameters<typeof ClassCard>[0]['item'] }) {
  const cancel = useCancelEnrollment(item.id)
  const { showToast } = useToast()
  const canCancel = canCancelEnrollment(item.startDate)
  const handleCancel = () => {
    if (!window.confirm(`Hủy đăng ký lớp “${item.title}”?`)) return
    cancel.mutate(undefined, {
      onSuccess: () => showToast('Đã hủy đăng ký lớp.'),
      onError: (error) => showToast({ type: 'error', message: getErrorMessage(error) }),
    })
  }
  return (
    <div>
      <ClassCard item={item} />
      {item.cancelledAt && (
        <p className="mt-2 font-semibold text-rose-700">
          Lớp đã hủy. Học phí đã thanh toán đang chờ đối soát hoàn tiền.
        </p>
      )}
      {canCancel && !item.cancelledAt && (
        <Button
          variant="danger"
          className="mt-2 w-full"
          disabled={cancel.isPending}
          onClick={handleCancel}
        >
          Hủy đăng ký
        </Button>
      )}
    </div>
  )
}

export function MyClassesPage() {
  const [params, setParams] = useSearchParams()
  const status = readEnrollmentStatus(params.get('status'))
  const page = readPositivePage(params.get('page'))
  const query = useMyEnrollments({ status, page, limit: 9 })
  const waitlist = useMyWaitlist()
  const navigate = useNavigate()
  const isUpdating = query.isFetching && query.isPlaceholderData
  const update = (key: string, value: string) =>
    setParams((current) => {
      current.set(key, value)
      if (key === 'status') current.set('page', '1')
      return current
    })
  usePaginationBounds(page, query.data?.meta.totalPages, (lastPage) =>
    update('page', String(lastPage)),
  )
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-3xl font-black">Lớp của tôi</h1>
      <div className="mt-5 flex gap-2">
        {(['upcoming', 'past', 'all'] as const).map((value) => (
          <button
            key={value}
            aria-pressed={status === value}
            onClick={() => update('status', value)}
            className={`rounded-full px-4 py-2 font-semibold ${status === value ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600'}`}
          >
            {value === 'upcoming' ? 'Sắp học' : value === 'past' ? 'Đã qua' : 'Tất cả'}
          </button>
        ))}
      </div>
      <section className="mt-7 rounded-2xl border bg-white p-5">
        <h2 className="text-xl font-bold">Danh sách chờ</h2>
        {waitlist.isPending ? (
          <p className="mt-3 text-sm text-slate-500">Đang tải danh sách chờ…</p>
        ) : waitlist.isError ? (
          <ErrorState
            message={getErrorMessage(waitlist.error)}
            onRetry={() => waitlist.refetch()}
          />
        ) : waitlist.data.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Bạn chưa tham gia danh sách chờ lớp nào.</p>
        ) : (
          <div className="mt-4 divide-y">
            {waitlist.data.map((entry) => (
              <WaitlistItem
                key={entry.classId}
                entry={entry}
                onPayment={() => navigate(`/payments/${entry.classId}`)}
              />
            ))}
          </div>
        )}
      </section>
      <div className="mt-7">
        <UpdatingContent updating={isUpdating} label="Đang cập nhật lớp đã đăng ký">
          {query.isPending ? (
            <LoadingState />
          ) : query.isError ? (
            <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
          ) : query.data.data.length === 0 ? (
            <EmptyState title="Bạn chưa có lớp phù hợp" />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {query.data.data.map((item) => (
                <EnrollmentItem key={item.id} item={item} />
              ))}
            </div>
          )}
          {query.data && (
            <Pagination
              page={query.data.meta.page}
              totalPages={query.data.meta.totalPages}
              onPageChange={(value) => update('page', String(value))}
            />
          )}
        </UpdatingContent>
      </div>
    </section>
  )
}

function WaitlistItem({ entry, onPayment }: { entry: WaitlistEntry; onPayment: () => void }) {
  const leave = useLeaveWaitlist(entry.classId)
  const accept = useAcceptWaitlistOffer(entry.classId)
  const { showToast } = useToast()
  const handleLeave = () =>
    leave.mutate(undefined, {
      onSuccess: () => showToast('Đã rời danh sách chờ.'),
      onError: (error) => showToast({ type: 'error', message: getErrorMessage(error) }),
    })
  const handleAccept = () =>
    accept.mutate(undefined, {
      onSuccess: (result) =>
        result.payment
          ? onPayment()
          : showToast('Đã xác nhận suất học. Bạn đã được đăng ký vào lớp.'),
      onError: (error) => showToast({ type: 'error', message: getErrorMessage(error) }),
    })
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link
          className="font-semibold text-emerald-800 hover:underline"
          to={`/classes/${entry.classId}`}
        >
          {entry.title ?? 'Lớp học'}
        </Link>
        <p className="text-sm text-slate-600">
          {entry.status === 'offered'
            ? `Được mời giữ chỗ đến ${entry.offerExpiresAt ? new Date(entry.offerExpiresAt).toLocaleString('vi-VN') : 'khi hết hạn'}`
            : `Đang chờ${entry.position ? ` · vị trí ${entry.position}` : ''}`}
        </p>
      </div>
      {entry.status === 'offered' ? (
        <Button disabled={accept.isPending} onClick={handleAccept}>
          {accept.isPending ? 'Đang xác nhận…' : 'Xác nhận suất'}
        </Button>
      ) : (
        <Button variant="danger" disabled={leave.isPending} onClick={handleLeave}>
          {leave.isPending ? 'Đang rời…' : 'Rời danh sách'}
        </Button>
      )}
    </div>
  )
}
