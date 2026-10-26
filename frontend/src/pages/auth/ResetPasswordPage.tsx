import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { AuthInput } from '../../components/auth/AuthInput'
import { Button } from '../../components/ui/Button'
import { useResetPassword } from '../../hooks/auth/useAuth'
import { resetPasswordSchema } from '../../schemas/auth.schema'
import type { ResetPasswordFormInput } from '../../types/auth.types'
import { applyApiFieldErrors } from '../../utils/form-error'

const readResetToken = () => {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? ''
  return /^[a-f0-9]{64}$/.test(token) ? token : ''
}

export function ResetPasswordPage() {
  const [token] = useState(readResetToken)
  const [done, setDone] = useState(false)
  const [failure, setFailure] = useState('')
  const mutation = useResetPassword()
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(window.history.state, '', window.location.pathname)
    }
  }, [])
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmNewPassword: '' },
  })

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-slate-900">Đặt lại mật khẩu</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Sau khi đặt lại, mọi phiên đăng nhập cũ sẽ hết hiệu lực.
      </p>
      {!token && (
        <p role="alert" className="mt-7 rounded-lg bg-rose-50 p-4 text-sm text-rose-800">
          Link không hợp lệ. Vui lòng yêu cầu một link mới.
        </p>
      )}
      {done && (
        <p role="status" className="mt-7 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">
          Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.
        </p>
      )}
      {token && !done && (
        <form
          className="mt-7 space-y-5"
          onSubmit={handleSubmit((input) => {
            setFailure('')
            mutation.mutate(
              { token, newPassword: input.newPassword },
              {
                onSuccess: () => setDone(true),
                onError: (error) =>
                  setFailure(applyApiFieldErrors(error, setError, ['newPassword']).message),
              },
            )
          })}
        >
          <AuthInput
            label="Mật khẩu mới"
            fieldId="newPassword"
            icon={KeyRound}
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <AuthInput
            label="Xác nhận mật khẩu"
            fieldId="confirmNewPassword"
            icon={KeyRound}
            type="password"
            autoComplete="new-password"
            error={errors.confirmNewPassword?.message}
            {...register('confirmNewPassword')}
          />
          {failure && (
            <p role="alert" className="text-sm text-rose-700">
              {failure}
            </p>
          )}
          <Button className="w-full rounded-lg bg-emerald-700 py-3" disabled={mutation.isPending}>
            {mutation.isPending ? 'Đang cập nhật…' : 'Đặt lại mật khẩu'}
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
