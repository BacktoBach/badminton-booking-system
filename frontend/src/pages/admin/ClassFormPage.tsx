import { useNavigate, useParams } from 'react-router-dom'
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

export function ClassFormPage() {
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

  const submitCreate = (input: ClassWriteInput, { handleApiError }: ClassFormSubmitContext) =>
    create.mutate(input, mutationOptions('Đã tạo lớp học.', handleApiError))

  const submitUpdate = (
    input: Partial<ClassWriteInput>,
    { handleApiError }: ClassFormSubmitContext,
  ) => update.mutate(input, mutationOptions('Đã cập nhật lớp học.', handleApiError))

  const form = editing ? (
    <ClassForm
      mode="edit"
      initial={detail.data!}
      pending={update.isPending}
      onSubmit={submitUpdate}
    />
  ) : (
    <ClassForm mode="create" pending={create.isPending} onSubmit={submitCreate} />
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
