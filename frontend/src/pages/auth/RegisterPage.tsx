import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { InputField } from '../../components/ui/FormField'
import { useToast } from '../../contexts/ToastContext'
import { useRegister } from '../../hooks/auth/useAuth'
import { registerSchema } from '../../schemas/auth.schema'
import type { RegisterInput } from '../../types/auth.types'
import { getErrorMessage } from '../../utils/api-error'

export function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema), defaultValues: { name: '', email: '', password: '' } })
  const mutation = useRegister(); const navigate = useNavigate(); const { showToast } = useToast()
  const submit = (input: RegisterInput) => mutation.mutate(input, { onSuccess: () => { showToast('Đăng ký thành công. Hãy đăng nhập.'); navigate('/login') }, onError: (error) => showToast({ type: 'error', message: getErrorMessage(error) }) })
  return <><h1 className="text-2xl font-black">Tạo tài khoản học viên</h1><p className="mt-1 text-sm text-slate-500">Role luôn là user; không thể đăng ký tài khoản admin.</p><form className="mt-6 space-y-5" onSubmit={handleSubmit(submit)}><InputField label="Họ tên" fieldId="name" error={errors.name?.message} {...register('name')} /><InputField label="Email" fieldId="email" type="email" error={errors.email?.message} {...register('email')} /><InputField label="Mật khẩu" fieldId="password" type="password" error={errors.password?.message} {...register('password')} /><Button className="w-full" disabled={mutation.isPending}>Đăng ký</Button></form><p className="mt-6 text-center text-sm">Đã có tài khoản? <Link className="font-bold text-emerald-700" to="/login">Đăng nhập</Link></p></>
}
