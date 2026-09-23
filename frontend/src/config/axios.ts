import axios from 'axios'
import { env } from './env'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
})

let unauthorizedHandler: (() => void) | undefined
export const setUnauthorizedHandler = (handler?: () => void) => { unauthorizedHandler = handler }

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const path = error.config?.url ?? ''
      if (!path.endsWith('/auth/login') && !path.endsWith('/auth/me')) unauthorizedHandler?.()
    }
    return Promise.reject(error)
  },
)
