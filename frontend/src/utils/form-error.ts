import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { toAppApiError } from './api-error'

export const applyApiFieldErrors = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  allowedFields: readonly Path<T>[],
) => {
  const apiError = toAppApiError(error)
  const allowed = new Set<string>(allowedFields)

  Object.entries(apiError.fieldErrors).forEach(([field, messages]) => {
    if (allowed.has(field) && messages[0]) {
      setError(field as Path<T>, { type: 'server', message: messages[0] })
    }
  })

  return apiError
}
