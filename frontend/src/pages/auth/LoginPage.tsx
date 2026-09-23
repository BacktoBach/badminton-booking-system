import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { InputField } from '../../components/ui/FormField'
import { useToast } from '../../contexts/ToastContext'
import { useLogin } from '../../hooks/auth/useAuth'
import { loginSchema } from '../../schemas/auth.schema'
import type { LoginInput } from '../../types/auth.types'
import { getErrorMessage, toAppApiError } from '../../utils/api-error'

export function LoginPage() {
  const { register, handleSubmit, setError, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '', remember: false } })
  const login = useLogin(); const navigate = useNavigate(); const location = useLocation(); const { showToast } = useToast()
  const submit = (input: LoginInput) => login.mutate(input, { onSuccess: ({ user }) => { showToast('Đăng nhập thành công.'); const requested = (location.state as { from?: string } | null)?.from; navigate(requested ?? (user.role === 'admin' ? '/admin/classes' : '/classes'), { replace: true }) }, onError: (error) => { const apiError = toAppApiError(error); Object.entries(apiError.fieldErrors).forEach(([field, messages]) => setError(field as keyof LoginInput, { message: messages[0] })); showToast({ type: 'error', message: getErrorMessage(error) }) } })
  return <><h1 className="text-2xl font-black">Chào mừng trở lại</h1><p className="mt-1 text-sm text-slate-500">Đăng nhập để quản lý các lớp học của bạn.</p><form className="mt-6 space-y-5" onSubmit={handleSubmit(submit)}><InputField label="Email" fieldId="email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} /><InputField label="Mật khẩu" fieldId="password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} /><label className="flex gap-2 text-sm"><input type="checkbox" {...register('remember')} /> Duy trì đăng nhập</label><Button className="w-full" disabled={login.isPending}>{login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}</Button></form><p className="mt-6 text-center text-sm text-slate-600">Chưa có tài khoản? <Link className="font-bold text-emerald-700" to="/register">Đăng ký</Link></p></>
}
