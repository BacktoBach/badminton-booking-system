import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoadingState, UpdatingContent } from '../../../src/components/feedback/States'
import { Button } from '../../../src/components/ui/Button'
import { SelectField, TextareaField } from '../../../src/components/ui/FormField'

describe('shared component accessibility', () => {
  it('styles destructive actions with the danger variant', () => {
    render(<Button variant="danger">Hủy đăng ký</Button>)

    expect(screen.getByRole('button', { name: 'Hủy đăng ký' })).toHaveClass('bg-rose-600')
  })

  it('announces the loading state', () => {
    render(<LoadingState />)

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải dữ liệu…')
  })

  it('announces updates and makes stale content inert', () => {
    render(
      <UpdatingContent updating label="Đang cập nhật danh sách">
        <button>Thao tác cũ</button>
      </UpdatingContent>,
    )

    expect(screen.getByRole('status', { name: 'Đang cập nhật danh sách' })).toHaveTextContent(
      'Đang cập nhật danh sách…',
    )
    const staleContent = screen.getByText('Thao tác cũ', { selector: 'button' }).parentElement
    expect(staleContent).toHaveAttribute('inert')
    expect(staleContent).toHaveClass('pointer-events-none', 'opacity-50')
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
