import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../config/axios'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  UpdatingContent,
} from '../../components/feedback/States'
import { Pagination } from '../../components/ui/Pagination'
import { useClassStudents } from '../../hooks/classes/useClasses'
import { useDebouncedSearchParam } from '../../hooks/useDebouncedSearchParam'
import { usePaginationBounds } from '../../hooks/usePaginationBounds'
import { getErrorMessage } from '../../utils/api-error'
import { formatDateTime } from '../../utils/date'
import { readPositivePage, SEARCH_MAX_LENGTH } from '../../utils/search-params'

export function StudentsPage() {
  const { classId = '' } = useParams()
  const payments = useQuery({
    queryKey: ['admin', 'class-payments', classId],
    queryFn: async () =>
      (
        await apiClient.get<{
          data: Array<{
            userId: string
            name: string
            email: string
            status: string
            amountVnd: number
            paymentCode: string | null
            expiresAt: string | null
            paidAt: string | null
          }>
        }>(`/admin/classes/${classId}/payments`)
      ).data.data,
    enabled: Boolean(classId),
  })
  const { params, search, searchParam, setParams, setSearch } = useDebouncedSearchParam()
  const page = readPositivePage(params.get('page'))
  const query = useClassStudents(classId, { page, limit: 20, search: searchParam || undefined })
  const isUpdating = query.isFetching && query.isPlaceholderData
  usePaginationBounds(page, query.data?.meta.totalPages, (lastPage) =>
    setParams((current) => {
      current.set('page', String(lastPage))
      return current
    }),
  )
  return (
    <>
      <h1 className="text-3xl font-black">Danh sách học viên</h1>
      <label className="mt-6 block max-w-lg">
        <span className="sr-only">Tìm học viên theo tên hoặc email</span>
        <input
          maxLength={SEARCH_MAX_LENGTH}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-xl border bg-white px-4 py-3"
          placeholder="Tìm theo tên hoặc email..."
        />
      </label>
      <div className="mt-6">
        <UpdatingContent updating={isUpdating} label="Đang cập nhật danh sách học viên">
          {query.isPending ? (
            <LoadingState />
          ) : query.isError ? (
            <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
          ) : query.data.data.length === 0 ? (
            <EmptyState title="Chưa có học viên" />
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-white">
              <table className="w-full text-left">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th scope="col" className="p-4">
                      Họ tên
                    </th>
                    <th scope="col">Email</th>
                    <th scope="col">Đăng ký lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.data.map((student) => (
                    <tr key={student.id} className="border-b last:border-0">
                      <td className="p-4 font-semibold">{student.name}</td>
                      <td>{student.email}</td>
                      <td>{formatDateTime(student.enrolledAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {query.data && (
            <Pagination
              page={query.data.meta.page}
              totalPages={query.data.meta.totalPages}
              onPageChange={(value) =>
                setParams((current) => {
                  current.set('page', String(value))
                  return current
                })
              }
            />
          )}
        </UpdatingContent>
      </div>
      {payments.data?.some((payment) => payment.amountVnd > 0) && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold">Trạng thái thanh toán</h2>
          {payments.isPending ? (
            <LoadingState />
          ) : payments.isError ? (
            <ErrorState
              message={getErrorMessage(payments.error)}
              onRetry={() => payments.refetch()}
            />
          ) : payments.data.length === 0 ? (
            <EmptyState title="Chưa có đăng ký" />
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border bg-white">
              <table className="w-full text-left">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="p-4">Học viên</th>
                    <th>Email</th>
                    <th>Học phí</th>
                    <th>Trạng thái</th>
                    <th>Mã chuyển khoản</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.data.map((payment) => (
                    <tr key={payment.userId} className="border-b last:border-0">
                      <td className="p-4 font-semibold">{payment.name}</td>
                      <td>{payment.email}</td>
                      <td>{payment.amountVnd.toLocaleString('vi-VN')} ₫</td>
                      <td>{payment.status}</td>
                      <td className="font-mono">{payment.paymentCode ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  )
}
