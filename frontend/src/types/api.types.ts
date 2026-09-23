export type PaginationMeta = {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export type DataResponse<T> = { data: T; message?: string }
export type PaginatedResponse<T> = { data: T[]; meta: PaginationMeta; message?: string }

export type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
    details?: Record<string, string[]>
  }
}

export type AppApiError = {
  status: number
  code: string
  message: string
  fieldErrors: Record<string, string[]>
}
