export type UserRole = 'admin' | 'user'

export type User = {
  id: string
  name: string
  email: string
  role: UserRole
}

export type Session = { expiresAt: string }
export type AuthSession = { user: User; session: Session }
export type LoginInput = { email: string; password: string; remember: boolean }
export type RegisterInput = { name: string; email: string; password: string }
export type ChangePasswordInput = { oldPassword: string; newPassword: string }
