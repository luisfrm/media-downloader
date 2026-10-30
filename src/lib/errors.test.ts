import { describe, expect, it } from 'vitest'
import { friendlyProbeError, hasPlaylistParam } from './errors'

describe('friendlyProbeError', () => {
  it('maps unsupported urls', () => {
    expect(friendlyProbeError('ERROR: Unsupported URL: https://example.com')).toMatch(/no está soportado/i)
  })

  it('maps login and cookie requirements', () => {
    expect(friendlyProbeError('ERROR: Sign in to confirm your age')).toMatch(/cookies/i)
    expect(friendlyProbeError('ERROR: Private video')).toMatch(/sesión iniciada/i)
  })

  it('maps availability and network errors', () => {
    expect(friendlyProbeError('ERROR: Video unavailable')).toMatch(/no está disponible/i)
    expect(friendlyProbeError('ERROR: HTTP Error 404: Not Found')).toMatch(/no está disponible/i)
    expect(friendlyProbeError('ERROR: network timeout')).toMatch(/conexión/i)
  })

  it('trims noisy engine output', () => {
    const long = `ERROR: ${'x'.repeat(400)}`
    expect(friendlyProbeError(long).length).toBeLessThanOrEqual(221)
  })
})

describe('hasPlaylistParam', () => {
  it('detects playlist links', () => {
    expect(hasPlaylistParam('https://www.youtube.com/watch?v=abc&list=PL123')).toBe(true)
    expect(hasPlaylistParam('https://www.youtube.com/playlist?list=PL123')).toBe(true)
    expect(hasPlaylistParam('https://x.com/user/status/1')).toBe(false)
  })
})
