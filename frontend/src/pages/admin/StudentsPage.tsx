import { useSearchParams, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/States'
import { Pagination } from '../../components/ui/Pagination'
import { useClassStudents } from '../../hooks/classes/useClasses'
import { getErrorMessage } from '../../utils/api-error'
import { formatDate } from '../../components/classes/ClassCard'

export function StudentsPage() {
  const { classId = '' } = useParams(); const [params, setParams] = useSearchParams(); const page = Math.max(1, Number(params.get('page')) || 1); const search = params.get('search') ?? ''; const query = useClassStudents(classId, { page, limit: 20, search: search || undefined })
  return <><h1 className="text-3xl font-black">Danh sách học viên</h1><form className="mt-6" onSubmit={(event) => { event.preventDefault(); const value = new FormData(event.currentTarget).get('search')?.toString().trim() ?? ''; setParams(value ? { search: value, page: '1' } : { page: '1' }) }}><input name="search" defaultValue={search} className="w-full max-w-lg rounded-xl border bg-white px-4 py-3" placeholder="Tìm theo tên hoặc email rồi nhấn Enter..." /></form><div className="mt-6">{query.isPending ? <LoadingState /> : query.isError ? <ErrorState message={getErrorMessage(query.error)} /> : query.data.data.length === 0 ? <EmptyState title="Chưa có học viên" /> : <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left"><thead className="border-b bg-slate-50"><tr><th className="p-4">Họ tên</th><th>Email</th><th>Đăng ký lúc</th></tr></thead><tbody>{query.data.data.map((student) => <tr key={student.id} className="border-b last:border-0"><td className="p-4 font-semibold">{student.name}</td><td>{student.email}</td><td>{formatDate(student.enrolledAt)}</td></tr>)}</tbody></table></div>}{query.data && <Pagination page={query.data.meta.page} totalPages={query.data.meta.totalPages} onPageChange={(value) => setParams((current) => { current.set('page', String(value)); return current })} />}</div></>
}
