import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClassCard } from '../../components/classes/ClassCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { Pagination } from '../../components/ui/Pagination'
import { useClasses } from '../../hooks/classes/useClasses'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { ClassLevel } from '../../types/class.types'
import { getErrorMessage } from '../../utils/api-error'

export function ClassListPage() {
  const [params, setParams] = useSearchParams(); const searchParam = params.get('search') ?? ''; const [search, setSearch] = useState(searchParam); const debounced = useDebouncedValue(search)
  const page = Math.max(1, Number(params.get('page')) || 1); const level = (params.get('level') || undefined) as ClassLevel | undefined
  useEffect(() => { if (debounced === searchParam) return; setParams((current) => { if (debounced) current.set('search', debounced); else current.delete('search'); current.set('page', '1'); return current }, { replace: true }) }, [debounced, searchParam, setParams])
  const query = useClasses({ page, limit: 8, search: searchParam || undefined, level })
  const change = (key: string, value?: string) => setParams((current) => { if (value) current.set(key, value); else current.delete(key); if (key !== 'page') current.set('page', '1'); return current })
  return <><section className="bg-gradient-to-br from-emerald-50 to-sky-50"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-2"><div><span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-emerald-700">Sẵn sàng nâng trình?</span><h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">Tìm lớp cầu lông <span className="text-emerald-700">vừa sức, đúng lịch.</span></h1><p className="mt-5 max-w-xl text-lg text-slate-600">Chọn lớp theo trình độ, theo dõi số chỗ còn lại và đăng ký trong vài giây.</p></div><div className="grid min-h-64 place-items-center rounded-[2rem] bg-emerald-900 p-8 text-center text-white shadow-xl"><div><div className="text-6xl">🏸</div><p className="mt-5 text-xl font-black">3 cấp độ · Số chỗ cập nhật từ API</p></div></div></div></section><section className="mx-auto max-w-7xl px-4 py-10"><div className="grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-[1fr_220px]"><label className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={20} /><span className="sr-only">Tìm theo tên lớp</span><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl bg-slate-50 py-3 pl-11 pr-3 outline-none focus:ring-2 focus:ring-emerald-600" placeholder="Tìm theo tên lớp..." /></label><select aria-label="Lọc trình độ" value={level ?? ''} onChange={(event) => change('level', event.target.value)} className="rounded-xl border border-slate-200 px-3"><option value="">Tất cả trình độ</option><option value="beginner">Cơ bản</option><option value="intermediate">Trung cấp</option><option value="advanced">Nâng cao</option></select></div><div className="mt-6">{query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} /> : !query.data.data.length ? <EmptyState title="Không tìm thấy lớp" /> : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{query.data.data.map((item) => <ClassCard key={item.id} item={item} />)}</div>} {query.data && <Pagination page={query.data.meta.page} totalPages={query.data.meta.totalPages} onPageChange={(value) => change('page', String(value))} />}</div></section></>
}
