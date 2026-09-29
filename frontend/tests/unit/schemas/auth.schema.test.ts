import { describe, expect, it } from 'vitest'
import { changePasswordSchema, registerSchema } from '../../../src/schemas/auth.schema'

describe('auth schemas', () => {
  it('requires matching new-password confirmation', () => {
    const result = changePasswordSchema.safeParse({
      oldPassword: 'Password123',
      newPassword: 'NewPassword123',
      confirmNewPassword: 'different',
    })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues.some((issue) => issue.path[0] === 'confirmNewPassword')).toBe(true)
  })

  it('rejects passwords beyond the bcrypt byte limit', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: 'ă'.repeat(40),
    })
    expect(result.success).toBe(false)
  })
})
