import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classService } from '../../services/class.service'
import {
  ClassForm,
  type ClassFormErrorHandler,
  type ClassFormSubmitContext,
} from '../../components/classes/ClassForm'
import { ErrorState, LoadingState } from '../../components/feedback/States'
import { useToast } from '../../contexts/ToastContext'
import { useClassDetail, useCreateClass, useUpdateClass } from '../../hooks/classes/useClasses'
import type { ClassWriteInput } from '../../types/class.types'
import { getErrorMessage } from '../../utils/api-error'
import { toBusinessDateTimeInput } from '../../utils/date'

export function ClassFormPage() {
  const [recurring, setRecurring] = useState(false)
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [days, setDays] = useState<number[]>([])
  const [scope, setScope] = useState<'one' | 'series'>('one')
  const queryClient = useQueryClient()
  const seriesCreate = useMutation({
    mutationFn: ({
      input,
      recurrence,
    }: {
      input: ClassWriteInput
      recurrence: { endDate: string; endTime: string; weekdays: number[] }
    }) => classService.createSeries(input, recurrence),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
  })
  const seriesUpdate = useMutation({
    mutationFn: (input: Partial<ClassWriteInput>) => classService.updateSeries(classId!, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
  })
  const { classId } = useParams()
  const editing = Boolean(classId)
  const detail = useClassDetail(classId ?? '')
  const create = useCreateClass()
  const update = useUpdateClass(classId ?? '')
  const navigate = useNavigate()
  const { showToast } = useToast()
  if (editing && detail.isPending) return <LoadingState />
  if (editing && detail.isError)
    return <ErrorState message={getErrorMessage(detail.error)} onRetry={() => detail.refetch()} />

  const mutationOptions = (successMessage: string, handleApiError: ClassFormErrorHandler) => ({
    onSuccess: () => {
      showToast(successMessage)
      navigate('/admin/classes')
    },
    onError: (error: unknown) => {
      const apiError = handleApiError(error)
      showToast({ type: 'error' as const, message: apiError.message })
    },
  })

  const submitCreate = (input: ClassWriteInput, { handleApiError }: ClassFormSubmitContext) => {
    if (recurring) {
      if (!endDate || !endTime || !days.length) {
        showToast({ type: 'error', message: 'Chọn ngày kết thúc và ít nhất một thứ trong tuần.' })
        return
      }
      const labels = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
      const schedule = `${[...days]
        .sort((a, b) => a - b)
        .map((day) => labels[day])
        .join(', ')} - ${toBusinessDateTimeInput(input.startDate).slice(11)}–${endTime}`
      seriesCreate.mutate(
        { input: { ...input, schedule }, recurrence: { endDate, endTime, weekdays: days } },
        mutationOptions('Đã tạo chuỗi buổi học.', handleApiError),
      )
    } else create.mutate(input, mutationOptions('Đã tạo lớp học.', handleApiError))
  }

  const submitUpdate = (
    input: Partial<ClassWriteInput>,
    { handleApiError }: ClassFormSubmitContext,
  ) => {
    if (scope === 'series') {
      if (input.startDate) {
        showToast({ type: 'error', message: 'Để đổi ngày giờ, hãy chọn sửa một buổi.' })
        return
      }
      seriesUpdate.mutate(
        input,
        mutationOptions('Đã cập nhật các buổi chưa bắt đầu.', handleApiError),
      )
    } else update.mutate(input, mutationOptions('Đã cập nhật lớp học.', handleApiError))
  }

  const form = editing ? (
    <ClassForm
      mode="edit"
      initial={detail.data!}
      pending={update.isPending || seriesUpdate.isPending}
      onSubmit={submitUpdate}
    >
      {detail.data?.seriesId && (
        <label className="block rounded-xl border bg-white p-4">
          Phạm vi cập nhật{' '}
          <select
            className="ml-3 rounded border p-2"
            value={scope}
            onChange={(event) => setScope(event.target.value as 'one' | 'series')}
          >
            <option value="one">Buổi này</option>
            <option value="series">Tất cả buổi chưa bắt đầu trong chuỗi</option>
          </select>
        </label>
      )}
    </ClassForm>
  ) : (
    <ClassForm
      mode="create"
      pending={create.isPending || seriesCreate.isPending}
      onSubmit={submitCreate}
    >
      <section className="rounded-xl border bg-white p-5">
        <label>
          <input
            type="checkbox"
            checked={recurring}
            onChange={(event) => setRecurring(event.target.checked)}
          />{' '}
          Tạo chuỗi buổi học lặp hàng tuần
        </label>
        {recurring && (
          <div className="mt-4 space-y-3">
            <p className="text-sm">
              Giờ học lấy từ ngày khai giảng; mỗi buổi được đăng ký và thanh toán riêng.
            </p>
            <label>
              Ngày kết thúc{' '}
              <input
                className="ml-2 rounded border p-2"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
            <label>
              Giờ kết thúc{' '}
              <input
                className="ml-2 rounded border p-2"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              {['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'].map((label, day) => (
                <label key={day}>
                  <input
                    type="checkbox"
                    checked={days.includes(day)}
                    onChange={(event) =>
                      setDays(
                        event.target.checked
                          ? [...days, day]
                          : days.filter((value) => value !== day),
                      )
                    }
                  />{' '}
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}
      </section>
    </ClassForm>
  )

  return (
    <>
      <p className="font-bold uppercase tracking-wide text-emerald-700">Admin workspace</p>
      <h1 className="mt-2 text-3xl font-black">
        {editing ? 'Chỉnh sửa lớp học' : 'Tạo lớp học mới'}
      </h1>
      <p className="mt-2 mb-8 text-slate-500">
        Điền đầy đủ thông tin mà học viên cần để quyết định đăng ký.
      </p>
      {form}
    </>
  )
}
