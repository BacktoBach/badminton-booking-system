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
}
