import { useMutation, useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '../hooks/auth/useAuth'
import { apiClient } from '../config/axios'
import { Button } from '../components/ui/Button'
import { getErrorMessage } from '../utils/api-error'

export function PrivacyPage() {
  const auth = useCurrentUser()
  const request = useQuery({
    queryKey: ['data-deletion-request', auth.data?.user.id],
    queryFn: async () =>
      (await apiClient.get<{ data: { requestedAt: string | null } }>('/auth/data-deletion-request'))
        .data.data,
    enabled: auth.data?.user.role === 'user',
  })
  const submit = useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/data-deletion-request')
    },
    onSuccess: () => request.refetch(),
  })

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 text-slate-700">
      <h1 className="text-3xl font-bold text-slate-950">Chính sách bảo mật</h1>
      <div className="mt-6 space-y-4 leading-7">
        <p>
          ShuttleUp thu thập họ tên, email, thông tin đăng ký lớp và giao dịch thanh toán để quản lý
          tài khoản, giữ chỗ, hỗ trợ học viên và đối soát học phí.
        </p>
        <p>
          Dữ liệu chỉ được chia sẻ với các đơn vị cung cấp hạ tầng, thanh toán và gửi email khi cần
          để vận hành dịch vụ. Mật khẩu được lưu dưới dạng băm; phiên đăng nhập dùng cookie
          HTTP-only.
        </p>
        <p>
          Người dùng có thể xem tên và email tài khoản sau khi đăng nhập, cùng lịch sử lớp và thanh
          toán trong mục “Lớp của tôi”. Có thể yêu cầu xóa dữ liệu dưới đây; các thông tin giao dịch
          cần lưu để đối soát hoặc theo nghĩa vụ pháp luật sẽ được xem xét riêng trước khi xử lý.
        </p>
        <p>
          Thông tin về quyền dữ liệu cá nhân được tham chiếu theo Luật Bảo vệ dữ liệu cá nhân
          91/2025/QH15 và Nghị định 356/2025/NĐ-CP.
        </p>
      </div>
      {auth.data?.user && (
        <div className="mt-8 rounded-xl border bg-white p-5">
          <h2 className="font-bold">Thông tin tài khoản</h2>
          <p className="mt-2 text-sm">Họ tên: {auth.data.user.name}</p>
          <p className="text-sm">Email: {auth.data.user.email}</p>
        </div>
      )}
      {auth.data?.user.role === 'user' && (
        <div className="mt-8 rounded-xl border bg-white p-5">
          <h2 className="font-bold">Yêu cầu xóa dữ liệu cá nhân</h2>
          <p className="mt-2 text-sm">
            Yêu cầu sẽ được ghi nhận để quản trị viên kiểm tra dữ liệu và nghĩa vụ lưu trữ trước khi
            xử lý.
          </p>
          {request.data?.requestedAt ? (
            <p className="mt-3 text-emerald-700">Đã tiếp nhận yêu cầu.</p>
          ) : (
            <Button
              className="mt-4"
              disabled={request.isPending || submit.isPending}
              onClick={() => submit.mutate()}
            >
              Gửi yêu cầu xóa dữ liệu
            </Button>
          )}
          {submit.isError && (
            <p role="alert" className="mt-2 text-rose-700">
              {getErrorMessage(submit.error)}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
