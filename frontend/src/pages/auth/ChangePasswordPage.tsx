import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { InputField } from '../../components/ui/FormField'
import { useToast } from '../../contexts/ToastContext'
import { useChangePassword } from '../../hooks/auth/useAuth'
import { changePasswordSchema } from '../../schemas/auth.schema'
import type { ChangePasswordInput } from '../../types/auth.types'
import { getErrorMessage } from '../../utils/api-error'

export function ChangePasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) })
  const mutation = useChangePassword(); const navigate = useNavigate(); const { showToast } = useToast()
  return <section className="mx-auto max-w-lg px-4 py-12"><div className="rounded-2xl bg-white p-7 shadow-sm"><h1 className="text-2xl font-black">Đổi mật khẩu</h1><form className="mt-6 space-y-5" onSubmit={handleSubmit((input) => mutation.mutate(input, { onSuccess: () => { showToast('Đã đổi mật khẩu. Vui lòng đăng nhập lại.'); navigate('/login', { replace: true }) }, onError: (error) => showToast({ type: 'error', message: getErrorMessage(error) }) }))}><InputField label="Mật khẩu hiện tại" fieldId="oldPassword" type="password" error={errors.oldPassword?.message} {...register('oldPassword')} /><InputField label="Mật khẩu mới" fieldId="newPassword" type="password" error={errors.newPassword?.message} {...register('newPassword')} /><Button disabled={mutation.isPending}>Lưu mật khẩu</Button></form></div></section>
}
