import { apiClient } from '../config/axios'
import type { DataResponse } from '../types/api.types'
import type { AuthSession, ChangePasswordInput, LoginInput, RegisterInput, User } from '../types/auth.types'

export const authService = {
  async login(input: LoginInput) {
    return (await apiClient.post<DataResponse<AuthSession>>('/auth/login', input)).data.data
  },
  async register(input: RegisterInput) {
    return (await apiClient.post<DataResponse<{ user: User }>>('/auth/register', input)).data.data.user
  },
  async logout() {
    await apiClient.post('/auth/logout')
  },
  async me() {
    return (await apiClient.get<DataResponse<AuthSession>>('/auth/me')).data.data
  },
  async changePassword(input: ChangePasswordInput) {
    await apiClient.put('/auth/change-password', input)
  },
}
