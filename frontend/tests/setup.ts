import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { queryClient } from '../src/config/query-client'
import { setUnauthorizedHandler } from '../src/config/axios'
import { server } from './msw/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  queryClient.clear()
  setUnauthorizedHandler()
})

afterAll(() => server.close())
