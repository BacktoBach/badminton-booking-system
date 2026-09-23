import { z } from 'zod'

export const loginSchema = z.object({ email: z.email('Email không hợp lệ').max(255), password: z.string().min(1, 'Vui lòng nhập mật khẩu'), remember: z.boolean() })
export const registerSchema = z.object({ name: z.string().trim().min(2, 'Tên cần ít nhất 2 ký tự').max(100), email: z.email('Email không hợp lệ').max(255), password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự') })
export const changePasswordSchema = z.object({ oldPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'), newPassword: z.string().min(8, 'Mật khẩu mới cần ít nhất 8 ký tự') }).refine((data) => data.oldPassword !== data.newPassword, { path: ['newPassword'], message: 'Mật khẩu mới phải khác mật khẩu hiện tại' })
