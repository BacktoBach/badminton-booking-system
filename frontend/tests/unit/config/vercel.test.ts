import { describe, expect, it } from 'vitest'
import vercelConfig from '../../../vercel.json'

describe('Vercel security headers', () => {
  const headers = Object.fromEntries(
    vercelConfig.headers.flatMap((rule) =>
      rule.headers.map(({ key, value }) => [key.toLowerCase(), value]),
    ),
  )

  it('protects every frontend route with baseline browser security headers', () => {
    expect(vercelConfig.headers).toContainEqual(expect.objectContaining({ source: '/(.*)' }))
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['permissions-policy']).toContain('camera=()')
  })

  it('uses a restrictive content security policy compatible with the same-origin API proxy', () => {
    const policy = headers['content-security-policy']

    expect(policy).toContain("default-src 'self'")
    expect(policy).toContain("connect-src 'self'")
    expect(policy).toContain("frame-ancestors 'none'")
    expect(policy).toContain("object-src 'none'")
  })
})
