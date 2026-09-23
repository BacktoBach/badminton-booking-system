import { apiClient } from '../config/axios'
import type { DataResponse, PaginatedResponse } from '../types/api.types'
import type { BadmintonClass } from '../types/class.types'
import type { EnrolledClass, MyEnrollmentParams } from '../types/enrollment.types'

export const enrollmentService = {
  async mine(params: MyEnrollmentParams) {
    return (await apiClient.get<PaginatedResponse<EnrolledClass>>('/enrollments/me', { params })).data
  },
  async enroll(classId: string) {
    return (await apiClient.post<DataResponse<BadmintonClass>>(`/classes/${classId}/enrollments`)).data.data
  },
  async cancel(classId: string) {
    return (await apiClient.delete<DataResponse<BadmintonClass>>(`/classes/${classId}/enrollments`)).data.data
  },
}
