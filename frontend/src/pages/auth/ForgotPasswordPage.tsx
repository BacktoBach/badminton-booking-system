import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { AuthInput } from '../../components/auth/AuthInput'
import { Button } from '../../components/ui/Button'
import { useForgotPassword } from '../../hooks/auth/useAuth'
import { forgotPasswordSchema } from '../../schemas/auth.schema'
import type { ForgotPasswordInput } from '../../types/auth.types'
import { applyApiFieldErrors } from '../../utils/form-error'

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [failure, setFailure] = useState('')
  const mutation = useForgotPassword()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-slate-900">Quên mật khẩu</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Nhập email đăng ký. Nếu tài khoản tồn tại, chúng tôi sẽ gửi link đặt lại mật khẩu có hiệu
        lực 20 phút.
      </p>
      {sent ? (
        <p role="status" className="mt-7 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">
          Nếu email đã đăng ký, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra cả
          thư rác.
        </p>
      ) : (
        <form
          className="mt-7 space-y-5"
          onSubmit={handleSubmit((input) => {
            setFailure('')
            mutation.mutate(input, {
              onSuccess: () => setSent(true),
              onError: (error) =>
                setFailure(applyApiFieldErrors(error, setError, ['email']).message),
            })
          })}
        >
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
          {failure && (
            <p role="alert" className="text-sm text-rose-700">
              {failure}
            </p>
          )}
          <Button className="w-full rounded-lg bg-emerald-700 py-3" disabled={mutation.isPending}>
            {mutation.isPending ? 'Đang gửi…' : 'Gửi link đặt lại mật khẩu'}
          </Button>
        </form>
      )}
      <Link
        className="mt-6 inline-block text-sm font-semibold text-emerald-800 hover:underline"
        to="/login"
      >
        Quay lại đăng nhập
      </Link>
    </>
  )
}
