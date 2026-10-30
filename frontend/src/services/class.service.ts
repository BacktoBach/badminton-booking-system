import { apiClient } from '../config/axios'
import type { DataResponse, PaginatedResponse } from '../types/api.types'
import type {
  BadmintonClass,
  ClassListParams,
  ClassWriteInput,
  Student,
  StudentListParams,
} from '../types/class.types'

export const classService = {
  async list(params: ClassListParams, signal?: AbortSignal) {
    return (await apiClient.get<PaginatedResponse<BadmintonClass>>('/classes', { params, signal }))
      .data
  },
  async adminList(params: ClassListParams, signal?: AbortSignal) {
    return (
      await apiClient.get<PaginatedResponse<BadmintonClass>>('/admin/classes', { params, signal })
    ).data
  },
  async detail(id: string, signal?: AbortSignal) {
    return (await apiClient.get<DataResponse<BadmintonClass>>(`/classes/${id}`, { signal })).data
      .data
  },
  async create(input: ClassWriteInput) {
    return (await apiClient.post<DataResponse<BadmintonClass>>('/classes', input)).data.data
  },
  async createSeries(
    input: ClassWriteInput,
    recurrence: { endDate: string; endTime: string; weekdays: number[] },
  ) {
    await apiClient.post('/classes/series', { class: input, recurrence })
  },
  async updateSeries(id: string, input: Partial<ClassWriteInput>) {
    await apiClient.patch(`/classes/${id}/series`, input)
  },
  async cancelSeries(id: string) {
    await apiClient.delete(`/classes/${id}/series`)
  },
  async update(id: string, input: Partial<ClassWriteInput>) {
    return (await apiClient.patch<DataResponse<BadmintonClass>>(`/classes/${id}`, input)).data.data
  },
  async remove(id: string) {
    await apiClient.delete(`/classes/${id}`)
  },
  async students(id: string, params: StudentListParams, signal?: AbortSignal) {
    return (
      await apiClient.get<PaginatedResponse<Student>>(`/classes/${id}/students`, { params, signal })
    ).data
  },
  async attendance(id: string) {
    return (
      await apiClient.get<{
        data: Array<{ userId: string; name: string; email: string; checkedInAt: string | null }>
      }>(`/admin/classes/${id}/attendance`)
    ).data.data
  },
  async checkInQr(id: string) {
    return (
      await apiClient.get<{ data: { token: string; expiresAt: string } }>(
        `/admin/classes/${id}/check-in-qr`,
      )
    ).data.data
  },
  async checkIn(id: string, token: string) {
    return (
      await apiClient.post<{ data: { checkedInAt: string } }>(`/classes/${id}/check-in`, { token })
    ).data.data
  },
  async uploadImage(id: string, file: File) {
    return (
      await apiClient.put<{ data: { imageUrl: string } }>(`/admin/classes/${id}/image`, file, {
        headers: { 'Content-Type': file.type },
      })
    ).data.data
  },
}
