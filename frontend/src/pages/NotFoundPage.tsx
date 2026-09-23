import { Link } from 'react-router-dom'
export const NotFoundPage = () => <main className="grid min-h-[60vh] place-items-center p-4 text-center"><div><p className="text-6xl font-black text-emerald-700">404</p><h1 className="mt-3 text-2xl font-black">Không tìm thấy trang</h1><Link className="mt-5 inline-block font-bold text-emerald-700" to="/classes">Về danh sách lớp</Link></div></main>
