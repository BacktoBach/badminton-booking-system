import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Mail, UserRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { AuthInput } from '../../components/auth/AuthInput'
import { useToast } from '../../contexts/ToastContext'
import { useRegister } from '../../hooks/auth/useAuth'
import { registerSchema } from '../../schemas/auth.schema'
import type { RegisterInput } from '../../types/auth.types'
import { applyApiFieldErrors } from '../../utils/form-error'

export function RegisterPage() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  })
  const mutation = useRegister()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const submit = (input: RegisterInput) =>
    mutation.mutate(input, {
      onSuccess: () => {
        showToast('Đăng ký thành công. Hãy đăng nhập.')
        navigate('/login')
      },
      onError: (error) => {
        const apiError = applyApiFieldErrors(error, setError, ['name', 'email', 'password'])
        showToast({ type: 'error', message: apiError.message })
      },
    })
  return (
    <>
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-800">
        <span className="size-1.5 rounded-full bg-emerald-700" /> Khởi đầu đam mê
      </div>
      <h1 className="font-serif text-3xl font-bold tracking-normal text-slate-900">
        Tạo tài khoản học viên
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Tạo tài khoản để tìm kiếm và đăng ký lớp học phù hợp.
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit(submit)}>
        <AuthInput
          label="Họ tên học viên"
          fieldId="name"
          icon={UserRound}
          autoComplete="name"
          maxLength={100}
          placeholder="Nguyễn Văn A"
          error={errors.name?.message}
          {...register('name')}
        />
        <AuthInput
          label="Email đăng ký"
          fieldId="email"
          icon={Mail}
          type="email"
          autoComplete="email"
          maxLength={255}
          placeholder="name@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <AuthInput
          label="Mật khẩu"
          fieldId="password"
          icon={KeyRound}
          type="password"
          autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button className="w-full rounded-lg bg-emerald-700 py-3" disabled={mutation.isPending}>
          {mutation.isPending ? 'Đang tạo tài khoản…' : 'Tạo tài khoản học viên'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        Đã có tài khoản?{' '}
        <Link
          className="font-bold text-emerald-800 underline decoration-emerald-300 underline-offset-4"
          to="/login"
        >
          Đăng nhập
        </Link>
      </p>
    </>
  )
}
