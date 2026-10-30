import { CalendarDays, MapPin, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../components/feedback/States'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../contexts/ToastContext'
import { useCurrentUser } from '../../hooks/auth/useAuth'
import { useClassDetail } from '../../hooks/classes/useClasses'
import { useCancelEnrollment, useEnroll } from '../../hooks/enrollments/useEnrollments'
import {
  useAcceptWaitlistOffer,
  useClassWaitlist,
  useJoinWaitlist,
  useLeaveWaitlist,
} from '../../hooks/enrollments/useWaitlist'
import { levelLabels } from '../../types/class.types'
import { getErrorMessage } from '../../utils/api-error'
import { canCancelEnrollment, formatDateTime, hasStarted } from '../../utils/date'

export function ClassDetailPage() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { classId = '' } = useParams()
  const query = useClassDetail(classId)
  const auth = useCurrentUser()
  const enroll = useEnroll(classId)
  const cancel = useCancelEnrollment(classId)
  const waitlist = useClassWaitlist(classId, auth.data?.user.role === 'user')
  const joinWaitlist = useJoinWaitlist(classId)
  const leaveWaitlist = useLeaveWaitlist(classId)
  const acceptOffer = useAcceptWaitlistOffer(classId)
  const { showToast } = useToast()
  const navigate = useNavigate()
  if (query.isPending)
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <LoadingState />
      </div>
    )
  if (query.isError)
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      </div>
    )
  const item = query.data
  const started = hasStarted(item.startDate)
  const isUser = auth.data?.user.role === 'user'
  const canEnroll = isUser && !item.isEnrolled && !item.isFull && !started
  const handleEnroll = () => {
    if (!auth.data) {
      navigate('/login', { state: { from: `/classes/${classId}` } })
      return
    }
    enroll.mutate(undefined, {
      onSuccess: (result) => {
        if (result.payment) {
          navigate(`/payments/${classId}`)
        } else showToast('Bạn đã đăng ký lớp học.')
      },
      onError: (error) => showToast({ type: 'error', message: getErrorMessage(error) }),
    })
  }
  const handleCancel = () => {
    cancel.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false)
        showToast('Đã hủy đăng ký lớp.')
      },
      onError: (error) => showToast({ type: 'error', message: getErrorMessage(error) }),
    })
  }
  const handleWaitlistJoin = () => {
    if (!auth.data) {
      navigate('/login', { state: { from: `/classes/${classId}` } })
      return
    }
    joinWaitlist.mutate(undefined, {
      onSuccess: () => showToast('Đã thêm bạn vào danh sách chờ.'),
      onError: (error) => showToast({ type: 'error', message: getErrorMessage(error) }),
    })
  }
  const handleWaitlistLeave = () => {
    leaveWaitlist.mutate(undefined, {
      onSuccess: () => showToast('Đã rời danh sách chờ.'),
      onError: (error) => showToast({ type: 'error', message: getErrorMessage(error) }),
    })
  }
  const handleAcceptOffer = () => {
    acceptOffer.mutate(undefined, {
      onSuccess: (result) => {
        if (result.payment) navigate(`/payments/${classId}`)
        else showToast('Đã xác nhận suất học. Bạn đã được đăng ký vào lớp.')
      },
      onError: (error) => showToast({ type: 'error', message: getErrorMessage(error) }),
    })
  }
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[1.4fr_.8fr]">
      <article className="rounded-3xl border bg-white p-7 shadow-sm">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">
          {levelLabels[item.level]}
        </span>
        <h1 className="mt-5 text-3xl font-black sm:text-4xl">{item.title}</h1>
        <p className="mt-2 font-semibold text-emerald-700">
          {item.tuitionVnd === 0
            ? 'Miễn phí'
            : `Học phí: ${item.tuitionVnd.toLocaleString('vi-VN')} ₫`}
        </p>
        <p className="mt-4 whitespace-pre-wrap text-slate-600">{item.description}</p>
        <div className="mt-8 grid gap-5 border-y py-7 sm:grid-cols-2">
          <p className="flex gap-3">
            <CalendarDays className="text-emerald-700" />{' '}
            <span>
              <small className="block text-slate-500">Khai giảng</small>
              <strong>{formatDateTime(item.startDate)}</strong>
            </span>
          </p>
          <p className="flex gap-3">
            <UserRound className="text-emerald-700" />{' '}
            <span>
              <small className="block text-slate-500">Huấn luyện viên</small>
              <strong>{item.coachName}</strong>
            </span>
          </p>
          <p className="flex gap-3">
            <MapPin className="text-emerald-700" />{' '}
            <span>
              <small className="block text-slate-500">Địa điểm</small>
              <strong>{item.location}</strong>
            </span>
          </p>
          <p>
            <small className="block text-slate-500">Lịch học</small>
            <strong>{item.schedule}</strong>
          </p>
        </div>
      </article>
      <aside>
        <div className="sticky top-24 rounded-3xl border bg-white p-7 shadow-sm">
          <p className="font-bold text-emerald-700">
            {item.cancelledAt
              ? 'Lớp đã hủy'
              : started
                ? 'Lớp đã bắt đầu'
                : item.isFull
                  ? 'Lớp đã đủ chỗ'
                  : 'Đang mở đăng ký'}
          </p>
          <h2 className="mt-2 text-2xl font-black">Giữ chỗ của bạn</h2>
          <div className="mt-5 rounded-xl bg-sky-50 p-5">
            <strong data-testid="class-capacity">
              {item.currentStudents}/{item.maxStudents}{' '}
              {item.tuitionVnd > 0 ? 'chỗ đã đăng ký hoặc giữ' : 'học viên'}
            </strong>
            <div className="mt-3 h-2 rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-700"
                style={{
                  width: `${Math.min(100, (item.currentStudents / item.maxStudents) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-3 text-sm text-slate-600">Còn {item.availableSlots} chỗ</p>
          </div>
          {item.cancelledAt ? (
            <p className="mt-5 text-sm text-rose-700">
              Lớp đã hủy. Học phí đã thanh toán sẽ được hoàn sau khi quản trị viên đối soát.
            </p>
          ) : auth.data?.user.role === 'admin' ? (
            <Link className="mt-5 block text-center font-bold text-emerald-700" to="/admin/classes">
              Quản lý lớp
            </Link>
          ) : item.hasPendingPayment && isUser ? (
            <Link
              className="mt-5 block rounded-xl bg-emerald-700 p-3 text-center font-semibold text-white"
              to={`/payments/${classId}`}
            >
              Tiếp tục thanh toán
            </Link>
          ) : item.isEnrolled && isUser && item.hasPaidTuition ? (
            <p className="mt-5 text-sm text-slate-600">
              Bạn đã thanh toán và ghi danh. Nếu cần hủy, hãy liên hệ quản trị viên để đối soát học
              phí.
            </p>
          ) : item.isEnrolled && isUser ? (
            <Button
              className="mt-5 w-full"
              variant="danger"
              disabled={!canCancelEnrollment(item.startDate) || cancel.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              {cancel.isPending
                ? 'Đang hủy…'
                : !canCancelEnrollment(item.startDate)
                  ? 'Đã hết hạn hủy (24 giờ)'
                  : 'Hủy đăng ký'}
            </Button>
          ) : item.isFull && isUser && waitlist.data?.status === 'offered' ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-emerald-800">
                Đến lượt bạn. Xác nhận trước{' '}
                {waitlist.data.offerExpiresAt
                  ? formatDateTime(waitlist.data.offerExpiresAt)
                  : 'khi hết hạn'}
                .
              </p>
              <Button
                className="w-full"
                disabled={acceptOffer.isPending}
                onClick={handleAcceptOffer}
              >
                {acceptOffer.isPending ? 'Đang xác nhận…' : 'Xác nhận giữ chỗ'}
              </Button>
            </div>
          ) : item.isFull && isUser && waitlist.data?.status === 'waiting' ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-slate-600">
                Bạn đang trong danh sách chờ
                {waitlist.data.position ? ` ở vị trí ${waitlist.data.position}` : ''}.
              </p>
              <Button
                className="w-full"
                variant="danger"
                disabled={leaveWaitlist.isPending}
                onClick={handleWaitlistLeave}
              >
                {leaveWaitlist.isPending ? 'Đang cập nhật…' : 'Rời danh sách chờ'}
              </Button>
            </div>
          ) : item.isFull && !started && isUser ? (
            <Button
              className="mt-5 w-full"
              disabled={joinWaitlist.isPending || waitlist.isPending}
              onClick={handleWaitlistJoin}
            >
              {joinWaitlist.isPending ? 'Đang tham gia…' : 'Tham gia danh sách chờ'}
            </Button>
          ) : (
            <Button
              className="mt-5 w-full"
              disabled={(Boolean(auth.data) && !canEnroll) || enroll.isPending}
              onClick={handleEnroll}
            >
              {enroll.isPending
                ? 'Đang đăng ký…'
                : auth.data
                  ? 'Đăng ký lớp học'
                  : 'Đăng nhập để đăng ký'}
            </Button>
          )}
        </div>
      </aside>
      {confirmOpen && (
        <ConfirmDialog
          message={`Hủy đăng ký lớp “${item.title}”?`}
          pending={cancel.isPending}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleCancel}
        />
      )}
    </section>
  )
}
