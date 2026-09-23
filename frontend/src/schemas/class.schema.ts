import { z } from 'zod'

export const classFormSchema = z.object({
  title: z.string().trim().min(3, 'Tên lớp cần ít nhất 3 ký tự').max(150),
  description: z.string().trim().min(10, 'Mô tả cần ít nhất 10 ký tự').max(5000),
  coachName: z.string().trim().min(2, 'Tên huấn luyện viên cần ít nhất 2 ký tự').max(100),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  startDate: z.string().min(1, 'Vui lòng chọn ngày khai giảng').refine((value) => new Date(value).getTime() > Date.now(), 'Ngày khai giảng phải ở tương lai'),
  schedule: z.string().trim().min(3).max(255),
  location: z.string().trim().min(3).max(255),
  maxStudents: z.number().int().min(1).max(500),
})
