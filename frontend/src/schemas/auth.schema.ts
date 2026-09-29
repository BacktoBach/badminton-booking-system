import { z } from 'zod'

const withinBcryptLimit = (value: string) => new TextEncoder().encode(value).length <= 72
const passwordLimitMessage = 'Mật khẩu không được vượt quá 72 byte UTF-8'
const requiredPassword = z
  .string()
  .min(1, 'Vui lòng nhập mật khẩu')
  .refine(withinBcryptLimit, passwordLimitMessage)
const newPassword = z
  .string()
  .min(8, 'Mật khẩu cần ít nhất 8 ký tự')
  .refine(withinBcryptLimit, passwordLimitMessage)

export const loginSchema = z.object({
  email: z.email('Email không hợp lệ').max(255),
  password: requiredPassword,
  remember: z.boolean(),
})
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Tên cần ít nhất 2 ký tự').max(100),
  email: z.email('Email không hợp lệ').max(255),
  password: newPassword,
})
export const changePasswordSchema = z
  .object({
    oldPassword: requiredPassword,
    newPassword,
    confirmNewPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    path: ['newPassword'],
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    path: ['confirmNewPassword'],
    message: 'Mật khẩu xác nhận không khớp',
  })
