import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { readSearch } from '../utils/search-params'
import { useDebouncedValue } from './useDebouncedValue'

export function useDebouncedSearchParam() {
  const [params, setParams] = useSearchParams()
  const searchParam = readSearch(params.get('search'))
  const [search, setSearch] = useState(searchParam)
  const debouncedSearch = useDebouncedValue(search)
  const lastPushedSearch = useRef(searchParam)

  useEffect(() => {
    if (searchParam === lastPushedSearch.current) return
    setSearch(searchParam)
  }, [searchParam])

  useEffect(() => {
    if (debouncedSearch === searchParam) {
      lastPushedSearch.current = searchParam
      return
    }
    if (searchParam !== lastPushedSearch.current) return

    lastPushedSearch.current = debouncedSearch
    setParams(
      (current) => {
        if (debouncedSearch) current.set('search', debouncedSearch)
        else current.delete('search')
        current.set('page', '1')
        return current
      },
      { replace: true },
    )
  }, [debouncedSearch, searchParam, setParams])

  return { params, search, searchParam, setParams, setSearch }
}
