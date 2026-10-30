import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '../ui/Button'
import { DateTimePicker } from '../ui/DateTimePicker'
import { InputField, SelectField, TextareaField } from '../ui/FormField'
import { SchedulePicker } from '../ui/SchedulePicker'
import { classEditFormSchema, classFormSchema } from '../../schemas/class.schema'
import { classLevels, levelLabels, type ClassWriteInput } from '../../types/class.types'
import type { AppApiError } from '../../types/api.types'
import {
  businessDateTimeInputToIso,
  hasStarted,
  parseBusinessDateTimeInput,
  toBusinessDateTimeInput,
} from '../../utils/date'
import { applyApiFieldErrors } from '../../utils/form-error'

type FormValues = Omit<ClassWriteInput, 'startDate'> & { startDate: string }
type DirtyFields = Partial<Record<keyof FormValues, boolean>>

export const buildClassUpdateInput = (
  values: FormValues,
  dirtyFields: DirtyFields,
): Partial<ClassWriteInput> => {
  const input: Partial<ClassWriteInput> = {}
  if (dirtyFields.title) input.title = values.title
  if (dirtyFields.description) input.description = values.description
  if (dirtyFields.coachName) input.coachName = values.coachName
  if (dirtyFields.level) input.level = values.level
  if (dirtyFields.startDate) input.startDate = businessDateTimeInputToIso(values.startDate)
  if (dirtyFields.schedule) input.schedule = values.schedule
  if (dirtyFields.location) input.location = values.location
  if (dirtyFields.maxStudents) input.maxStudents = Number(values.maxStudents)
  if (dirtyFields.tuitionVnd) input.tuitionVnd = Number(values.tuitionVnd)
  return input
}

type CommonProps = {
  pending: boolean
  children?: ReactNode
}

export type ClassFormErrorHandler = (error: unknown) => AppApiError
export type ClassFormSubmitContext = { handleApiError: ClassFormErrorHandler }

type ClassFormProps =
  | (CommonProps & {
      mode: 'create'
      initial?: undefined
      onSubmit: (input: ClassWriteInput, context: ClassFormSubmitContext) => void
    })
  | (CommonProps & {
      mode: 'edit'
      initial: ClassWriteInput
      onSubmit: (input: Partial<ClassWriteInput>, context: ClassFormSubmitContext) => void
    })

export function ClassForm({ mode, initial, pending, onSubmit, children }: ClassFormProps) {
  const editing = mode === 'edit'
  const classStarted = editing && hasStarted(initial.startDate)
  const initialStartDate = toBusinessDateTimeInput(initial?.startDate)
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    control,
    formState: { dirtyFields, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(editing ? classEditFormSchema : classFormSchema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      coachName: initial?.coachName ?? '',
      level: initial?.level ?? 'beginner',
      startDate: initialStartDate,
      schedule: initial?.schedule ?? '',
      location: initial?.location ?? '',
      maxStudents: initial?.maxStudents ?? 12,
      tuitionVnd: initial?.tuitionVnd ?? 0,
    },
  })
  const selectedStartDate = useWatch({ control, name: 'startDate' }) ?? ''
  const selectedSchedule = useWatch({ control, name: 'schedule' }) ?? ''
  const updateStartDate = (value: string) => {
    setValue('startDate', value, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }
  const updateSchedule = (value: string) => {
    setValue('schedule', value, { shouldDirty: true, shouldValidate: true })
  }
  const handleApiError: ClassFormErrorHandler = (error) =>
    applyApiFieldErrors(error, setError, [
      'title',
      'description',
      'coachName',
      'level',
      'startDate',
      'schedule',
      'location',
      'maxStudents',
      'tuitionVnd',
    ])

  const submit = (values: FormValues) => {
    clearErrors('root')
    if (!editing) {
      onSubmit(
        {
          ...values,
          startDate: businessDateTimeInputToIso(values.startDate),
          maxStudents: Number(values.maxStudents),
          tuitionVnd: Number(values.tuitionVnd),
        },
        { handleApiError },
      )
      return
    }

    if (
      dirtyFields.startDate &&
      (parseBusinessDateTimeInput(values.startDate)?.getTime() ?? 0) <= Date.now()
    ) {
      setError('startDate', { message: 'Ngày khai giảng phải ở tương lai' })
      return
    }

    const input = buildClassUpdateInput(values, dirtyFields)
    if (Object.keys(input).length === 0) {
      setError('root', { message: 'Chưa có thông tin nào được thay đổi.' })
      return
    }
    onSubmit(input, { handleApiError })
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
          {classLevels.map((value) => (
            <option key={value} value={value}>
              {levelLabels[value]}
            </option>
          ))}
        </SelectField>
      </section>
      <section className="grid gap-5 rounded-2xl border bg-white p-6 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-xl font-black">Lịch và sức chứa</h2>
        <div>
          <span id="startDate-label" className="block text-sm font-semibold text-slate-800">
            Ngày khai giảng (giờ VN)
          </span>
          <input type="hidden" {...register('startDate')} />
          <div className="mt-2">
            <DateTimePicker
              id="startDate-picker"
              labelId="startDate-label"
              value={selectedStartDate}
              onChange={updateStartDate}
              disabled={classStarted}
              error={errors.startDate?.message}
            />
          </div>
          {classStarted && (
            <p className="mt-1 text-xs text-slate-500">
              Không thể đổi ngày khai giảng của lớp đã bắt đầu.
            </p>
          )}
        </div>
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
          label="Học phí (VND, 0 = miễn phí)"
          fieldId="tuitionVnd"
          type="number"
          min={0}
          max={2000000000}
          step={1}
          error={errors.tuitionVnd?.message}
          {...register('tuitionVnd', { valueAsNumber: true })}
        />
        <div>
          <input type="hidden" {...register('schedule')} />
          <SchedulePicker
            value={selectedSchedule}
            onChange={updateSchedule}
            error={errors.schedule?.message}
          />
        </div>
        <InputField
          label="Địa điểm"
          fieldId="location"
          maxLength={255}
          error={errors.location?.message}
          {...register('location')}
        />
      </section>
      {children}
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
