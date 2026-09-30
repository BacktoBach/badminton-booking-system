import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../contexts/ToastContext'
import { useAdminClasses, useDeleteClass } from '../../hooks/classes/useClasses'
import { usePaginationBounds } from '../../hooks/usePaginationBounds'
import { getErrorMessage } from '../../utils/api-error'
import { formatDateTime } from '../../utils/date'
import {
  readClassLevel,
  readPositivePage,
  readSearch,
  SEARCH_MAX_LENGTH,
} from '../../utils/search-params'

export function AdminClassesPage() {
  const [params, setParams] = useSearchParams()
  const page = readPositivePage(params.get('page'))
  const level = readClassLevel(params.get('level'))
  const search = readSearch(params.get('search'))
  const query = useAdminClasses({ page, limit: 9, level, search: search || undefined })
  const remove = useDeleteClass()
  const { showToast } = useToast()

  const updateParams = (updates: Record<string, string | undefined>, resetPage = true) => {
    setParams((current) => {
      Object.entries(updates).forEach(([key, value]) =>
        value ? current.set(key, value) : current.delete(key),
      )
      if (resetPage) current.set('page', '1')
      return current
    })
  }
  usePaginationBounds(page, query.data?.meta.totalPages, (lastPage) =>
    updateParams({ page: String(lastPage) }, false),
  )

  const deleteClass = (id: string, title: string) => {
    if (!window.confirm(`Xóa lớp “${title}” và toàn bộ đăng ký liên quan?`)) return
    remove.mutate(id, {
      onSuccess: () => showToast('Đã xóa lớp học.'),
      onError: (error) => showToast({ type: 'error', message: getErrorMessage(error) }),
    })
  }

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-bold uppercase tracking-wider text-emerald-700">Admin workspace</p>
          <h1 className="mt-2 text-3xl font-black">Quản lý lớp học</h1>
          <p className="mt-2 text-slate-500">
            Tạo lịch mới, cập nhật sức chứa và theo dõi học viên.
          </p>
        </div>
        <Link
          to="/admin/classes/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-bold text-white"
        >
          <Plus size={18} /> Tạo lớp mới
        </Link>
      </div>

      <div className="mt-7 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_220px]">
        <form
          className="relative"
          onSubmit={(event) => {
            event.preventDefault()
            const value = readSearch(
              new FormData(event.currentTarget).get('search')?.toString() ?? null,
            )
            updateParams({ search: value })
          }}
        >
          <Search className="absolute left-3 top-3 text-slate-400" size={20} aria-hidden="true" />
          <input
            key={search}
            name="search"
            maxLength={SEARCH_MAX_LENGTH}
            defaultValue={search}
            className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-3 outline-none focus:ring-2 focus:ring-emerald-600"
            placeholder="Tìm tên lớp rồi nhấn Enter..."
          />
        </form>
        <select
          aria-label="Lọc trình độ"
          value={level ?? ''}
          onChange={(event) => updateParams({ level: event.target.value || undefined })}
          className="rounded-xl border border-slate-200 px-3"
        >
          <option value="">Tất cả trình độ</option>
          <option value="beginner">Cơ bản</option>
          <option value="intermediate">Trung cấp</option>
          <option value="advanced">Nâng cao</option>
        </select>
      </div>

      <div className="mt-6">
        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
        ) : query.data.data.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full min-w-[800px] text-left">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-4">Lớp học</th>
                  <th>Khai giảng</th>
                  <th>Trình độ</th>
                  <th>Học viên</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="p-4">
                      <strong>{item.title}</strong>
                      <small className="block text-slate-500">
                        {item.coachName} · {item.location}
                      </small>
                    </td>
                    <td>{formatDateTime(item.startDate)}</td>
                    <td>{item.level}</td>
                    <td>
                      {item.currentStudents}/{item.maxStudents}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link
                          aria-label={`Xem học viên lớp ${item.title}`}
                          className="rounded-lg border p-2"
                          to={`/admin/classes/${item.id}/students`}
                        >
                          <Users size={18} />
                        </Link>
                        <Link
                          aria-label={`Chỉnh sửa lớp ${item.title}`}
                          className="rounded-lg border p-2"
                          to={`/admin/classes/${item.id}/edit`}
                        >
                          <Pencil size={18} />
                        </Link>
                        <button
                          aria-label={`Xóa lớp ${item.title}`}
                          className="rounded-lg border p-2 text-rose-600"
                          disabled={remove.isPending}
                          onClick={() => deleteClass(item.id, item.title)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
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
            onPageChange={(value) => updateParams({ page: String(value) }, false)}
          />
        )}
      </div>
    </>
  )
}
