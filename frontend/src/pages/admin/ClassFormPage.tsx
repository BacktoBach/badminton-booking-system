import { useNavigate, useParams } from 'react-router-dom'
import { ClassForm } from '../../components/classes/ClassForm'
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
  if (editing && detail.isError) return <ErrorState message={getErrorMessage(detail.error)} />

  const mutationOptions = (successMessage: string) => ({
    onSuccess: () => {
      showToast(successMessage)
      navigate('/admin/classes')
    },
    onError: (error: unknown) =>
      showToast({ type: 'error' as const, message: getErrorMessage(error) }),
  })

  const submitCreate = (input: ClassWriteInput) =>
    create.mutate(input, mutationOptions('Đã tạo lớp học.'))

  const submitUpdate = (input: Partial<ClassWriteInput>) =>
    update.mutate(input, mutationOptions('Đã cập nhật lớp học.'))

  const form = editing ? (
    <ClassForm
      mode="edit"
      initial={detail.data!}
      pending={update.isPending}
      apiError={update.error}
      onSubmit={submitUpdate}
    />
  ) : (
    <ClassForm
      mode="create"
      pending={create.isPending}
      apiError={create.error}
      onSubmit={submitCreate}
    />
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
