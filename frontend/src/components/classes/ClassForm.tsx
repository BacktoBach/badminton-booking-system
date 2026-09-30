import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { Button } from '../ui/Button'
import { InputField, SelectField, TextareaField } from '../ui/FormField'
import { classEditFormSchema, classFormSchema } from '../../schemas/class.schema'
import type { ClassWriteInput } from '../../types/class.types'
import { hasStarted, parseDate } from '../../utils/date'
import { applyApiFieldErrors } from '../../utils/form-error'

type FormValues = Omit<ClassWriteInput, 'startDate'> & { startDate: string }
type DirtyFields = Partial<Record<keyof FormValues, boolean>>

const toLocalInput = (value?: string) => {
  const date = parseDate(value)
  return date
    ? new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
    : ''
}

export const buildClassUpdateInput = (
  values: FormValues,
  dirtyFields: DirtyFields,
): Partial<ClassWriteInput> => {
  const input: Partial<ClassWriteInput> = {}
  if (dirtyFields.title) input.title = values.title
  if (dirtyFields.description) input.description = values.description
  if (dirtyFields.coachName) input.coachName = values.coachName
  if (dirtyFields.level) input.level = values.level
  if (dirtyFields.startDate) input.startDate = new Date(values.startDate).toISOString()
  if (dirtyFields.schedule) input.schedule = values.schedule
  if (dirtyFields.location) input.location = values.location
  if (dirtyFields.maxStudents) input.maxStudents = Number(values.maxStudents)
  return input
}

type CommonProps = {
  pending: boolean
  apiError?: unknown
}

type ClassFormProps =
  | (CommonProps & {
      mode: 'create'
      initial?: undefined
      onSubmit: (input: ClassWriteInput) => void
    })
  | (CommonProps & {
      mode: 'edit'
      initial: ClassWriteInput
      onSubmit: (input: Partial<ClassWriteInput>) => void
    })

export function ClassForm({ mode, initial, pending, apiError, onSubmit }: ClassFormProps) {
  const editing = mode === 'edit'
  const classStarted = editing && hasStarted(initial.startDate)
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { dirtyFields, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(editing ? classEditFormSchema : classFormSchema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      coachName: initial?.coachName ?? '',
      level: initial?.level ?? 'beginner',
      startDate: toLocalInput(initial?.startDate),
      schedule: initial?.schedule ?? '',
      location: initial?.location ?? '',
      maxStudents: initial?.maxStudents ?? 12,
    },
  })
  useEffect(() => {
    if (apiError)
      applyApiFieldErrors(apiError, setError, [
        'title',
        'description',
        'coachName',
        'level',
        'startDate',
        'schedule',
        'location',
        'maxStudents',
      ])
  }, [apiError, setError])

  const submit = (values: FormValues) => {
    clearErrors('root')
    if (!editing) {
      onSubmit({
        ...values,
        startDate: new Date(values.startDate).toISOString(),
        maxStudents: Number(values.maxStudents),
      })
      return
    }

    if (dirtyFields.startDate && new Date(values.startDate).getTime() <= Date.now()) {
      setError('startDate', { message: 'Ngày khai giảng phải ở tương lai' })
      return
    }

    const input = buildClassUpdateInput(values, dirtyFields)
    if (Object.keys(input).length === 0) {
      setError('root', { message: 'Chưa có thông tin nào được thay đổi.' })
      return
    }
    onSubmit(input)
  }

  return (
    <form className="space-y-7" onSubmit={handleSubmit(submit)}>
      <section className="grid gap-5 rounded-2xl border bg-white p-6 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-xl font-black">Thông tin cơ bản</h2>
        <div className="sm:col-span-2">
          <InputField
            label="Tên lớp"
            fieldId="title"
            maxLength={150}
            error={errors.title?.message}
            {...register('title')}
          />
        </div>
        <div className="sm:col-span-2">
          <TextareaField
            label="Mô tả"
            fieldId="description"
            maxLength={5000}
            error={errors.description?.message}
            {...register('description')}
          />
        </div>
        <InputField
          label="Huấn luyện viên"
          fieldId="coachName"
          maxLength={100}
          error={errors.coachName?.message}
          {...register('coachName')}
        />
        <SelectField
          label="Trình độ"
          fieldId="level"
          error={errors.level?.message}
          {...register('level')}
        >
          <option value="beginner">Cơ bản</option>
          <option value="intermediate">Trung cấp</option>
          <option value="advanced">Nâng cao</option>
        </SelectField>
      </section>
      <section className="grid gap-5 rounded-2xl border bg-white p-6 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-xl font-black">Lịch và sức chứa</h2>
        <InputField
          label="Ngày khai giảng"
          fieldId="startDate"
          type="datetime-local"
          readOnly={classStarted}
          aria-readonly={classStarted}
          hint={classStarted ? 'Không thể đổi ngày khai giảng của lớp đã bắt đầu.' : undefined}
          error={errors.startDate?.message}
          {...register('startDate')}
        />
        <InputField
          label="Số học viên tối đa"
          fieldId="maxStudents"
          type="number"
          min={1}
          max={500}
          error={errors.maxStudents?.message}
          {...register('maxStudents', { valueAsNumber: true })}
        />
        <InputField
          label="Lịch học"
          fieldId="schedule"
          maxLength={255}
          error={errors.schedule?.message}
          {...register('schedule')}
        />
        <InputField
          label="Địa điểm"
          fieldId="location"
          maxLength={255}
          error={errors.location?.message}
          {...register('location')}
        />
      </section>
      <div className="flex justify-end">
        <div className="text-right">
          {errors.root?.message && (
            <p className="mb-2 text-sm text-rose-600" role="alert">
              {errors.root.message}
            </p>
          )}
          <Button disabled={pending}>{pending ? 'Đang lưu…' : 'Lưu lớp học'}</Button>
        </div>
      </div>
    </form>
  )
}
