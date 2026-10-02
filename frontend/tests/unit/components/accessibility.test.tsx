import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoadingState } from '../../../src/components/feedback/States'
import { SelectField, TextareaField } from '../../../src/components/ui/FormField'

describe('shared component accessibility', () => {
  it('announces the loading state', () => {
    render(<LoadingState />)

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải dữ liệu…')
  })

  it('connects textarea and select errors to their controls', () => {
    render(
      <>
        <TextareaField label="Mô tả" fieldId="description" error="Mô tả không hợp lệ" />
        <SelectField label="Trình độ" fieldId="level" error="Trình độ không hợp lệ">
          <option value="beginner">Cơ bản</option>
        </SelectField>
      </>,
    )

    expect(screen.getByLabelText('Mô tả')).toHaveAccessibleDescription('Mô tả không hợp lệ')
    expect(screen.getByLabelText('Trình độ')).toHaveAccessibleDescription('Trình độ không hợp lệ')
  })
})
