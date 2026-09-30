import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePaginationBounds } from '../../../src/hooks/usePaginationBounds'

describe('usePaginationBounds', () => {
  it('moves an out-of-range page to the last available page', async () => {
    const onPageOutOfBounds = vi.fn()

    renderHook(() => usePaginationBounds(5, 3, onPageOutOfBounds))

    await waitFor(() => expect(onPageOutOfBounds).toHaveBeenCalledWith(3))
  })

  it('uses page one when the result set is empty', async () => {
    const onPageOutOfBounds = vi.fn()

    renderHook(() => usePaginationBounds(2, 0, onPageOutOfBounds))

    await waitFor(() => expect(onPageOutOfBounds).toHaveBeenCalledWith(1))
  })

  it('does not change a valid page', () => {
    const onPageOutOfBounds = vi.fn()

    renderHook(() => usePaginationBounds(2, 3, onPageOutOfBounds))

    expect(onPageOutOfBounds).not.toHaveBeenCalled()
  })
})
