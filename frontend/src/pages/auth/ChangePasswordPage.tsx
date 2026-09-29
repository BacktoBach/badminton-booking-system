import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { AuthInput } from '../../components/auth/AuthInput'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../contexts/ToastContext'
import { useChangePassword } from '../../hooks/auth/useAuth'
import { changePasswordSchema } from '../../schemas/auth.schema'
import type { ChangePasswordFormInput } from '../../types/auth.types'
import { applyApiFieldErrors } from '../../utils/form-error'

export function ChangePasswordPage() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordFormInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmNewPassword: '' },
  })
  const mutation = useChangePassword()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const submit = (values: ChangePasswordFormInput) => {
    mutation.mutate(
      { oldPassword: values.oldPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          showToast('Đã đổi mật khẩu. Vui lòng đăng nhập lại.')
          navigate('/login', { replace: true })
        },
        onError: (error) => {
          const apiError = applyApiFieldErrors(error, setError, ['oldPassword', 'newPassword'])
          if (apiError.code === 'CURRENT_PASSWORD_INCORRECT') {
            setError('oldPassword', { type: 'server', message: apiError.message })
          }
          showToast({ type: 'error', message: apiError.message })
        },
      },
    )
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <ShieldCheck size={23} />
          </span>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Đổi mật khẩu</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Sau khi cập nhật, các phiên đăng nhập hiện tại sẽ bị thu hồi.
            </p>
          </div>
        </div>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit(submit)}>
          <AuthInput
            label="Mật khẩu hiện tại"
            fieldId="oldPassword"
            icon={KeyRound}
            type="password"
            autoComplete="current-password"
            placeholder="Nhập mật khẩu hiện tại"
            error={errors.oldPassword?.message}
            {...register('oldPassword')}
          />
          <AuthInput
            label="Mật khẩu mới"
            fieldId="newPassword"
            icon={KeyRound}
            type="password"
            autoComplete="new-password"
            placeholder="Tối thiểu 8 ký tự"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <AuthInput
            label="Xác nhận mật khẩu mới"
            fieldId="confirmNewPassword"
            icon={KeyRound}
            type="password"
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu mới"
            error={errors.confirmNewPassword?.message}
            {...register('confirmNewPassword')}
          />
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50"
              to="/classes"
            >
              Hủy
            </Link>
            <Button disabled={mutation.isPending}>
              {mutation.isPending ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}
