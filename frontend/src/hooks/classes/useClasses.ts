import { useMutation, useQuery } from '@tanstack/react-query'
import { queryClient } from '../../config/query-client'
import { classService } from '../../services/class.service'
import type { ClassListParams, ClassWriteInput, StudentListParams } from '../../types/class.types'

export const classKeys = {
  all: ['classes'] as const,
  lists: () => ['classes', 'list'] as const,
  list: (params: ClassListParams) => ['classes', 'list', params] as const,
  adminLists: () => ['classes', 'admin-list'] as const,
  adminList: (params: ClassListParams) => ['classes', 'admin-list', params] as const,
  detail: (id: string) => ['classes', 'detail', id] as const,
  students: (id: string, params: StudentListParams) => ['classes', id, 'students', params] as const,
}

export const useClasses = (params: ClassListParams) => useQuery({
  queryKey: classKeys.list(params), queryFn: () => classService.list(params), placeholderData: (previous) => previous,
})
export const useAdminClasses = (params: ClassListParams) => useQuery({
  queryKey: classKeys.adminList(params), queryFn: () => classService.adminList(params), placeholderData: (previous) => previous,
})
export const useClassDetail = (id: string) => useQuery({
  queryKey: classKeys.detail(id), queryFn: () => classService.detail(id), enabled: Boolean(id),
})
export const useClassStudents = (id: string, params: StudentListParams) => useQuery({
  queryKey: classKeys.students(id, params), queryFn: () => classService.students(id, params), enabled: Boolean(id), placeholderData: (previous) => previous,
})

const refreshClasses = () => Promise.all([
  queryClient.invalidateQueries({ queryKey: classKeys.lists() }),
  queryClient.invalidateQueries({ queryKey: classKeys.adminLists() }),
])

export const useCreateClass = () => useMutation({ mutationFn: classService.create, onSuccess: refreshClasses })
export const useUpdateClass = (id: string) => useMutation({
  mutationFn: (input: Partial<ClassWriteInput>) => classService.update(id, input),
  onSuccess: (updated) => {
    queryClient.setQueryData(classKeys.detail(id), updated)
    return refreshClasses()
  },
})
export const useDeleteClass = () => useMutation({
  mutationFn: classService.remove,
  onSuccess: (_, id) => {
    queryClient.removeQueries({ queryKey: classKeys.detail(id) })
    return refreshClasses()
  },
})
