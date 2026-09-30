import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { AuthInput } from '../../components/auth/AuthInput'
import { useToast } from '../../contexts/ToastContext'
import { useLogin } from '../../hooks/auth/useAuth'
import { loginSchema } from '../../schemas/auth.schema'
import type { LoginInput } from '../../types/auth.types'
import { applyApiFieldErrors } from '../../utils/form-error'
import { getPostLoginPath } from '../../utils/post-login-redirect'

export function LoginPage() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  })
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const submit = (input: LoginInput) =>
    login.mutate(input, {
      onSuccess: ({ user }) => {
        showToast('Đăng nhập thành công.')
        const requested = (location.state as { from?: string } | null)?.from
        navigate(getPostLoginPath(user.role, requested), { replace: true })
      },
      onError: (error) => {
        const apiError = applyApiFieldErrors(error, setError, ['email', 'password', 'remember'])
        showToast({ type: 'error', message: apiError.message })
      },
    })
  return (
    <>
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-800">
        <span className="size-1.5 rounded-full bg-emerald-700" /> Chơi cầu lông tốt hơn
      </div>
      <h1 className="font-serif text-3xl font-bold tracking-normal text-slate-900">
        Chào mừng trở lại
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Đăng nhập để tiếp tục hành trình luyện tập của bạn.
      </p>
      <form className="mt-7 space-y-5" onSubmit={handleSubmit(submit)}>
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
          autoComplete="current-password"
          placeholder="Nhập mật khẩu"
          error={errors.password?.message}
          {...register('password')}
        />
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
          <input className="size-4 accent-emerald-700" type="checkbox" {...register('remember')} />{' '}
          Duy trì đăng nhập
        </label>
        <Button className="w-full rounded-lg bg-emerald-700 py-3" disabled={login.isPending}>
          {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Chưa có tài khoản?{' '}
        <Link
          className="font-bold text-emerald-800 underline decoration-emerald-300 underline-offset-4"
          to="/register"
        >
          Đăng ký ngay
        </Link>
      </p>
    </>
  )
}
