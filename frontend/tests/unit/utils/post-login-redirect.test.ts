import { describe, expect, it } from 'vitest'
import { getPostLoginPath } from '../../../src/utils/post-login-redirect'

describe('getPostLoginPath', () => {
  it.each([
    ['admin', undefined, '/admin/classes'],
    ['user', undefined, '/classes'],
    ['admin', '/admin/classes/123/edit', '/admin/classes/123/edit'],
    ['user', '/my-classes?status=upcoming', '/my-classes?status=upcoming'],
    ['admin', '/my-classes', '/admin/classes'],
    ['admin', '/my-classes/', '/admin/classes'],
    ['user', '/admin/classes', '/classes'],
    ['user', '/classes/123', '/classes/123'],
    ['user', 'https://example.com', '/classes'],
    ['admin', '//example.com', '/admin/classes'],
  ] as const)('returns the correct destination for %s and %s', (role, requested, expected) => {
    expect(getPostLoginPath(role, requested)).toBe(expected)
  })
})
