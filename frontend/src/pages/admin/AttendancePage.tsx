import { useQuery } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../components/feedback/States'
import { classService } from '../../services/class.service'
import { getErrorMessage, toAppApiError } from '../../utils/api-error'
import { formatDateTime } from '../../utils/date'

export function AttendancePage() {
  const { classId = '' } = useParams()
  const detail = useQuery({
    queryKey: ['classes', 'detail', classId],
    queryFn: () => classService.detail(classId),
    enabled: Boolean(classId),
  })
  const attendance = useQuery({
    queryKey: ['classes', classId, 'attendance'],
    queryFn: () => classService.attendance(classId),
    enabled: Boolean(classId),
    refetchInterval: 10_000,
  })
  const qr = useQuery({
    queryKey: ['classes', classId, 'check-in-qr'],
    queryFn: () => classService.checkInQr(classId),
    enabled: Boolean(classId),
    refetchInterval: 30_000,
    retry: false,
  })
  if (detail.isPending) return <LoadingState />
  if (detail.isError)
    return <ErrorState message={getErrorMessage(detail.error)} onRetry={() => detail.refetch()} />
  const checkedIn = attendance.data?.filter((student) => student.checkedInAt).length ?? 0
  return (
    <section>
      <Link to="/admin/classes" className="font-semibold text-emerald-700">
        ← Quản lý lớp
      </Link>
      <h1 className="mt-3 text-3xl font-black">Điểm danh · {detail.data.title}</h1>
      <p className="mt-2 text-slate-600">Buổi học: {formatDateTime(detail.data.startDate)}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="text-xl font-bold">Mã QR điểm danh</h2>
          <p className="mt-2 text-sm text-slate-600">
            Chỉ hiển thị tại buổi học. Mã đổi sau mỗi phút và học viên phải đăng nhập tài khoản đã
            ghi danh.
          </p>
          {qr.isPending ? (
            <LoadingState />
          ) : qr.isError && toAppApiError(qr.error).code === 'CHECK_IN_CLOSED' ? (
            <p role="status" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              Mã QR sẽ xuất hiện khi buổi học mở điểm danh. Trang tự kiểm tra lại sau mỗi 30 giây.
            </p>
          ) : qr.isError ? (
            <ErrorState message={getErrorMessage(qr.error)} onRetry={() => qr.refetch()} />
          ) : (
            <div className="mt-4 flex flex-col items-center gap-3">
              <QRCodeSVG
                value={`${window.location.origin}/check-in/${classId}?token=${encodeURIComponent(qr.data.token)}`}
                size={220}
                aria-label="Mã QR điểm danh"
              />
              <p className="text-sm">Hết hạn: {formatDateTime(qr.data.expiresAt)}</p>
              <button className="font-semibold text-emerald-700" onClick={() => qr.refetch()}>
                Tạo mã mới
              </button>
            </div>
          )}
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="text-xl font-bold">
            Học viên đã điểm danh: {checkedIn}/{attendance.data?.length ?? 0}
          </h2>
          {attendance.isPending ? (
            <LoadingState />
          ) : attendance.isError ? (
            <ErrorState
              message={getErrorMessage(attendance.error)}
              onRetry={() => attendance.refetch()}
            />
          ) : attendance.data.length === 0 ? (
            <p className="mt-4">Chưa có học viên đã ghi danh.</p>
          ) : (
            <ul className="mt-4 divide-y">
              {attendance.data.map((student) => (
                <li key={student.userId} className="flex justify-between gap-3 py-3">
                  <span>
                    <strong>{student.name}</strong>
                    <small className="block text-slate-500">{student.email}</small>
                  </span>
                  <span>
                    {student.checkedInAt ? formatDateTime(student.checkedInAt) : 'Chưa đến'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  )
}
