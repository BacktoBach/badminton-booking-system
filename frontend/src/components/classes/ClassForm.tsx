import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { Button } from '../ui/Button'
import { InputField, SelectField, TextareaField } from '../ui/FormField'
import { classFormSchema } from '../../schemas/class.schema'
import type { ClassWriteInput } from '../../types/class.types'
import { parseDate } from '../../utils/date'
import { applyApiFieldErrors } from '../../utils/form-error'

type FormValues = Omit<ClassWriteInput, 'startDate'> & { startDate: string }
const toLocalInput = (value?: string) => {
  const date = parseDate(value)
  return date
    ? new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
    : ''
}
export function ClassForm({
  initial,
  pending,
  apiError,
  onSubmit,
}: {
  initial?: Partial<ClassWriteInput>
  pending: boolean
  apiError?: unknown
  onSubmit: (input: ClassWriteInput) => void
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(classFormSchema),
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
  return (
    <form
      className="space-y-7"
      onSubmit={handleSubmit((values) =>
        onSubmit({
          ...values,
          startDate: new Date(values.startDate).toISOString(),
          maxStudents: Number(values.maxStudents),
        }),
      )}
    >
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
        <Button disabled={pending}>{pending ? 'Đang lưu…' : 'Lưu lớp học'}</Button>
      </div>
    </form>
  )
}
