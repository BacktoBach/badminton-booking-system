import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiClient } from '../../config/axios'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { getErrorMessage } from '../../utils/api-error'
import { formatDateTime } from '../../utils/date'

type Review = {
  eventId: string
  paymentCode: string | null
  amountVnd: number
  accountNumber: string
  content: string
  referenceCode: string | null
  outcome: string
  receivedAt: string
}

export function PaymentReviewsPage() {
  const query = useQuery({
    queryKey: ['admin', 'payment-reviews'],
    queryFn: async () =>
      (await apiClient.get<{ data: Review[] }>('/admin/payment-reviews')).data.data,
  })
  return (
    <section>
      <Link to="/admin/classes" className="font-semibold text-emerald-700">
        ← Quản lý lớp
      </Link>
      <h1 className="mt-4 text-3xl font-black">Giao dịch cần đối soát</h1>
      <p className="mt-2 text-slate-600">
        Giao dịch sai tiền, quá hạn hoặc không khớp mã cần được kiểm tra thủ công. Không tự động ghi
        danh hay hoàn tiền.
      </p>
      <div className="mt-6">
        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
        ) : query.data.length === 0 ? (
          <EmptyState title="Không có giao dịch cần đối soát" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full text-left">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="p-4">Thời điểm</th>
                  <th>Mã</th>
                  <th>Nội dung</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                  <th>Tham chiếu</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((item) => (
                  <tr key={item.eventId} className="border-b last:border-0">
                    <td className="p-4">{formatDateTime(item.receivedAt)}</td>
                    <td className="font-mono">{item.paymentCode ?? 'Không khớp'}</td>
                    <td className="max-w-xs break-words">{item.content}</td>
                    <td>{item.amountVnd.toLocaleString('vi-VN')} ₫</td>
                    <td>{item.outcome}</td>
                    <td className="font-mono">{item.referenceCode ?? item.eventId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
