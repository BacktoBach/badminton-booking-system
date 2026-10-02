import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClientId } from '../../../src/utils/client-id'

describe('createClientId', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => 'secure-id')
    vi.stubGlobal('crypto', { randomUUID })

    expect(createClientId()).toBe('secure-id')
    expect(randomUUID).toHaveBeenCalledOnce()
  })

  it('creates distinct fallback IDs when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {})

    const first = createClientId()
    const second = createClientId()

    expect(first).not.toBe(second)
    expect(first).toMatch(/^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/)
  })

  it('allows auth session events to load without crypto.randomUUID', async () => {
    vi.resetModules()
    vi.stubGlobal('crypto', {})

    await expect(import('../../../src/utils/auth-session-events')).resolves.toBeDefined()
  })
})
