import { z } from 'zod'
import { classLevels } from '../types/class.types'
import { parseBusinessDateTimeInput } from '../utils/date'

const classBaseFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Tên lớp cần ít nhất 3 ký tự')
    .max(150, 'Tên lớp không được vượt quá 150 ký tự'),
  description: z
    .string()
    .trim()
    .min(10, 'Mô tả cần ít nhất 10 ký tự')
    .max(5000, 'Mô tả không được vượt quá 5.000 ký tự'),
  coachName: z
    .string()
    .trim()
    .min(2, 'Tên huấn luyện viên cần ít nhất 2 ký tự')
    .max(100, 'Tên huấn luyện viên không được vượt quá 100 ký tự'),
  level: z.enum(classLevels, { error: 'Vui lòng chọn trình độ hợp lệ' }),
  startDate: z
    .string()
    .min(1, 'Vui lòng chọn ngày khai giảng')
    .refine((value) => parseBusinessDateTimeInput(value) !== null, 'Ngày khai giảng không hợp lệ'),
  schedule: z
    .string()
    .trim()
    .min(3, 'Lịch học cần ít nhất 3 ký tự')
    .max(255, 'Lịch học không được vượt quá 255 ký tự'),
  location: z
    .string()
    .trim()
    .min(3, 'Địa điểm cần ít nhất 3 ký tự')
    .max(255, 'Địa điểm không được vượt quá 255 ký tự'),
  maxStudents: z
    .number({ error: 'Vui lòng nhập số học viên tối đa' })
    .int('Số học viên tối đa phải là số nguyên')
    .min(1, 'Số học viên tối đa phải từ 1 trở lên')
    .max(500, 'Số học viên tối đa không được vượt quá 500'),
})

export const classFormSchema = classBaseFormSchema.refine(
  (value) => (parseBusinessDateTimeInput(value.startDate)?.getTime() ?? 0) > Date.now(),
  { path: ['startDate'], message: 'Ngày khai giảng phải ở tương lai' },
)

export const classEditFormSchema = classBaseFormSchema
