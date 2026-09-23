import { Button } from './Button'

export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  return <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Phân trang"><Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Trước</Button><span className="text-sm text-slate-600">Trang {page}/{totalPages}</span><Button variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Sau</Button></nav>
}
