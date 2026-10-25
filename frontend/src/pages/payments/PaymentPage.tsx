import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../config/axios'
import { ErrorState, LoadingState } from '../../components/feedback/States'
import { getErrorMessage } from '../../utils/api-error'
import { classKeys } from '../../hooks/classes/useClasses'
import { enrollmentKeys } from '../../hooks/enrollments/useEnrollments'

type Payment = {
  classId: string
  classTitle: string
  status: string
  amountVnd: number
  paymentCode: string | null
  expiresAt: string | null
  serverNow: string
  receiver: { bankCode: string; accountNumber: string; accountName: string }
}

export function PaymentPage() {
  const { classId = '' } = useParams()
  const queryClient = useQueryClient()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const query = useQuery({
    queryKey: ['payment', classId],
    queryFn: async () => (await apiClient.get<{ data: Payment }>(`/payments/${classId}`)).data.data,
    enabled: Boolean(classId),
    refetchInterval: (result) => (result.state.data?.status === 'pending' ? 5000 : false),
  })
  useEffect(() => {
    if (query.data?.status !== 'paid') return
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: classKeys.detail(classId) }),
      queryClient.invalidateQueries({ queryKey: classKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.all }),
    ])
  }, [classId, query.data?.status, queryClient])
  if (query.isPending)
    return (
      <div className="mx-auto max-w-2xl p-8">
        <LoadingState />
      </div>
    )
  if (query.isError)
    return (
      <div className="mx-auto max-w-2xl p-8">
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      </div>
    )
  const payment = query.data
  const serverNow = Date.parse(payment.serverNow) + (now - query.dataUpdatedAt)
  const seconds = payment.expiresAt
    ? Math.max(0, Math.ceil((Date.parse(payment.expiresAt) - serverNow) / 1000))
    : 0
  const pending = payment.status === 'pending' && seconds > 0
  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-3xl border bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-black">Thanh toán học phí</h1>
        <p className="mt-2 text-slate-600">{payment.classTitle}</p>
        {payment.status === 'paid' ? (
          <p className="mt-6 font-semibold text-emerald-700">
            Đã nhận thanh toán và ghi danh thành công.
          </p>
        ) : pending ? (
          <>
            <p className="mt-6 text-sm text-amber-700">
              Chỗ được giữ trong {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}.
              Chuyển đúng số tiền và nội dung bên dưới.
            </p>
            <dl className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-slate-500">Ngân hàng</dt>
                <dd className="font-bold">{payment.receiver.bankCode}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Số tài khoản</dt>
                <dd className="font-bold">{payment.receiver.accountNumber}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Chủ tài khoản</dt>
                <dd className="font-bold">{payment.receiver.accountName}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Số tiền</dt>
                <dd className="font-bold">{payment.amountVnd.toLocaleString('vi-VN')} ₫</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-slate-500">Nội dung chuyển khoản</dt>
                <dd className="break-all font-mono text-lg font-bold">{payment.paymentCode}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-slate-500">
              Trạng thái tự cập nhật khi hệ thống nhận thông báo từ ngân hàng. Nếu chuyển sai hoặc
              trễ, hãy liên hệ quản trị viên; không chuyển lại trước khi được xác nhận.
            </p>
          </>
        ) : (
          <p className="mt-6 text-rose-700">
            Phiên giữ chỗ đã kết thúc hoặc giao dịch cần được quản trị viên kiểm tra.
          </p>
        )}
        <Link
          to={`/classes/${classId}`}
          className="mt-6 inline-block font-semibold text-emerald-700"
        >
          Về lớp học
        </Link>
      </div>
    </section>
  )
}
