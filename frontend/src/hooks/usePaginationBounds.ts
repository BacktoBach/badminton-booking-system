import { useEffect, useRef } from 'react'

export const usePaginationBounds = (
  page: number,
  totalPages: number | undefined,
  onPageOutOfBounds: (page: number) => void,
) => {
  const onPageOutOfBoundsRef = useRef(onPageOutOfBounds)
  onPageOutOfBoundsRef.current = onPageOutOfBounds

  useEffect(() => {
    if (totalPages === undefined) return

    const lastPage = Math.max(totalPages, 1)
    if (page > lastPage) onPageOutOfBoundsRef.current(lastPage)
  }, [page, totalPages])
}
