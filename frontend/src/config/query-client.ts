import axios from 'axios'
import { QueryClient } from '@tanstack/react-query'

export const shouldRetryQuery = (failureCount: number, error: unknown) => {
  if (axios.isAxiosError(error) && error.response && error.response.status < 500) return false
  return failureCount < 1
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: shouldRetryQuery, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
})
