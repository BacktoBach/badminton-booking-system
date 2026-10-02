import { describe, expect, it } from 'vitest'
import { shouldRetryQuery } from '../../../src/config/query-client'

const axiosError = (status?: number) => ({
  isAxiosError: true,
  response: status ? { status } : undefined,
})

describe('query retry policy', () => {
  it('does not retry client errors', () => {
    expect(shouldRetryQuery(0, axiosError(400))).toBe(false)
    expect(shouldRetryQuery(0, axiosError(404))).toBe(false)
  })

  it('retries network and server errors only once', () => {
    expect(shouldRetryQuery(0, axiosError())).toBe(true)
    expect(shouldRetryQuery(0, axiosError(503))).toBe(true)
    expect(shouldRetryQuery(1, axiosError())).toBe(false)
    expect(shouldRetryQuery(1, axiosError(503))).toBe(false)
  })
})
