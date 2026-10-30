import { useMutation } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { classService } from '../../services/class.service'
import { getErrorMessage } from '../../utils/api-error'
import { formatDateTime } from '../../utils/date'

export function CheckInPage() {
  const { classId = '' } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const checkIn = useMutation({ mutationFn: () => classService.checkIn(classId, token) })
  return (
    <section className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-3xl font-black">Điểm danh lớp học</h1>
      <p className="mt-3 text-slate-600">
        Chỉ xác nhận khi bạn đang có mặt tại buổi học và đăng nhập đúng tài khoản đã ghi danh.
      </p>
      {!token ? (
        <p role="alert" className="mt-5 text-rose-700">
          Mã QR không hợp lệ.
        </p>
      ) : checkIn.isSuccess ? (
        <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Đã điểm danh lúc {formatDateTime(checkIn.data.checkedInAt)}.
        </p>
      ) : (
        <>
          <Button className="mt-6" disabled={checkIn.isPending} onClick={() => checkIn.mutate()}>
            {checkIn.isPending ? 'Đang xác nhận…' : 'Xác nhận có mặt'}
          </Button>
          {checkIn.isError && (
            <p role="alert" className="mt-4 text-rose-700">
              {getErrorMessage(checkIn.error)}
            </p>
          )}
        </>
      )}
      <Link to={`/classes/${classId}`} className="mt-6 block font-semibold text-emerald-700">
        Xem lớp học
      </Link>
    </section>
  )
}
