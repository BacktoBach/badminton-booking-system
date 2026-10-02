import { LoaderCircle, Search } from 'lucide-react'
import { ClassCard } from '../../components/classes/ClassCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { Pagination } from '../../components/ui/Pagination'
import { useClasses } from '../../hooks/classes/useClasses'
import { useDebouncedSearchParam } from '../../hooks/useDebouncedSearchParam'
import { usePaginationBounds } from '../../hooks/usePaginationBounds'
import { classLevels, levelLabels } from '../../types/class.types'
import { getErrorMessage } from '../../utils/api-error'
import { readClassLevel, readPositivePage, SEARCH_MAX_LENGTH } from '../../utils/search-params'

export function ClassListPage() {
  const { params, search, searchParam, setParams, setSearch } = useDebouncedSearchParam()
  const page = readPositivePage(params.get('page'))
  const level = readClassLevel(params.get('level'))
  const change = (key: string, value?: string) =>
    setParams((current) => {
      if (value) current.set(key, value)
      else current.delete(key)
      if (key !== 'page') current.set('page', '1')
      return current
    })
  const query = useClasses({ page, limit: 8, search: searchParam || undefined, level })
  const isUpdating = query.isFetching && query.isPlaceholderData
  usePaginationBounds(page, query.data?.meta.totalPages, (lastPage) =>
    change('page', String(lastPage)),
  )
  return (
    <>
      <section className="bg-gradient-to-br from-emerald-50 to-sky-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-2">
          <div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-emerald-700">
              Sẵn sàng nâng trình?
            </span>
            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
              Tìm lớp cầu lông <span className="text-emerald-700">vừa sức, đúng lịch.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              Chọn lớp theo trình độ, theo dõi số chỗ còn lại và đăng ký trong vài giây.
            </p>
          </div>
          <div className="grid min-h-64 place-items-center rounded-[2rem] bg-emerald-900 p-8 text-center text-white shadow-xl">
            <div>
              <div className="text-6xl">🏸</div>
              <p className="mt-5 text-xl font-black">3 cấp độ · Số chỗ cập nhật từ API</p>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-[1fr_220px]">
          <label className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <span className="sr-only">Tìm theo tên lớp</span>
            <input
              maxLength={SEARCH_MAX_LENGTH}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl bg-slate-50 py-3 pl-11 pr-3 outline-none focus:ring-2 focus:ring-emerald-600"
              placeholder="Tìm theo tên lớp..."
            />
          </label>
          <select
            aria-label="Lọc trình độ"
            value={level ?? ''}
            onChange={(event) => change('level', event.target.value)}
            className="rounded-xl border border-slate-200 px-3"
          >
            <option value="">Tất cả trình độ</option>
            {classLevels.map((value) => (
              <option key={value} value={value}>
                {levelLabels[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="relative mt-6" aria-busy={isUpdating}>
          {isUpdating && (
            <div
              className="absolute inset-x-0 top-3 z-10 mx-auto flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-lg"
              role="status"
              aria-live="polite"
              aria-label="Đang cập nhật danh sách lớp"
            >
              <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
              Đang cập nhật danh sách lớp…
            </div>
          )}
          <div
            className={`transition-opacity ${isUpdating ? 'pointer-events-none opacity-50' : ''}`}
          >
            {query.isPending ? (
              <LoadingState />
            ) : query.isError ? (
              <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
            ) : !query.data.data.length ? (
              <EmptyState title="Không tìm thấy lớp" />
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {query.data.data.map((item) => (
                  <ClassCard key={item.id} item={item} />
                ))}
              </div>
            )}
            {query.data && (
              <Pagination
                page={query.data.meta.page}
                totalPages={query.data.meta.totalPages}
                onPageChange={(value) => change('page', String(value))}
              />
            )}
          </div>
        </div>
      </section>
    </>
  )
}
