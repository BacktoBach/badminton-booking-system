import { apiClient } from '../config/axios'
import type { DataResponse } from '../types/api.types'

export type WaitlistEntry = {
  classId: string
  title?: string
  status: 'waiting' | 'offered'
  joinedAt?: string
  offerExpiresAt: string | null
  position: number | null
}

export const waitlistService = {
  async mine(signal?: AbortSignal) {
    return (await apiClient.get<DataResponse<WaitlistEntry[]>>('/waitlist/me', { signal })).data
      .data
  },
  async forClass(classId: string, signal?: AbortSignal) {
    return (
      await apiClient.get<DataResponse<WaitlistEntry | null>>(`/waitlist/classes/${classId}`, {
        signal,
      })
    ).data.data
  },
  async join(classId: string) {
    return (
      await apiClient.post<DataResponse<{ id: string; status: 'waiting'; position: number }>>(
        `/waitlist/classes/${classId}`,
      )
    ).data.data
  },
  async leave(classId: string) {
    await apiClient.delete(`/waitlist/classes/${classId}`)
  },
  async accept(classId: string) {
    return (
      await apiClient.post<DataResponse<{ payment?: { status: 'pending' } }>>(
        `/waitlist/classes/${classId}/accept`,
      )
    ).data.data
  },
}
