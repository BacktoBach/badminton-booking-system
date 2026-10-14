import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdatePrompt() {
  const [updateError, setUpdateError] = useState(false)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <section
      role="status"
      aria-label="Cập nhật ứng dụng"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl"
    >
      <p className="font-semibold text-slate-900">Đã có phiên bản mới</p>
      <p className="mt-1 text-sm text-slate-600">
        Lưu thông tin đang nhập trước khi cập nhật. Trang sẽ tải lại sau khi bạn chọn cập nhật.
      </p>
      {updateError && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          Không thể cập nhật lúc này. Kiểm tra kết nối rồi thử lại.
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Để sau
        </button>
        <button
          type="button"
          onClick={() => {
            setUpdateError(false)
            void updateServiceWorker().catch(() => setUpdateError(true))
          }}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Cập nhật
        </button>
      </div>
    </section>
  )
}
