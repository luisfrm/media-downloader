import { describe, expect, it } from 'vitest'
import { detectPlatform, looksLikeUrl, normalizeUrl } from './platform'

describe('detectPlatform', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube'],
    ['https://youtu.be/dQw4w9WgXcQ', 'youtube'],
    ['https://music.youtube.com/watch?v=1', 'youtube'],
    ['https://x.com/DonShelby_/status/2116216248291754237', 'x'],
    ['https://twitter.com/user/status/1', 'x'],
    ['https://www.instagram.com/reel/abc/', 'instagram'],
    ['https://instagram.com/p/abc', 'instagram'],
    ['https://www.tiktok.com/@user/video/123', 'tiktok'],
    ['https://vm.tiktok.com/ZMabc/', 'tiktok'],
    ['https://www.facebook.com/watch/?v=123', 'facebook'],
    ['https://fb.watch/abc/', 'facebook'],
    ['https://vimeo.com/12345', 'other'],
    ['', 'other'],
    ['hola mundo', 'other'],
  ])('%s -> %s', (input, expected) => {
    expect(detectPlatform(input)).toBe(expected)
  })
})

describe('looksLikeUrl', () => {
  it('accepts urls with and without protocol', () => {
    expect(looksLikeUrl('https://x.com/a')).toBe(true)
    expect(looksLikeUrl('x.com/a')).toBe(true)
  })

  it('rejects plain text and empty values', () => {
    expect(looksLikeUrl('hola mundo')).toBe(false)
    expect(looksLikeUrl('')).toBe(false)
    expect(looksLikeUrl('   ')).toBe(false)
  })
})

describe('normalizeUrl', () => {
  it('adds https when the protocol is missing', () => {
    expect(normalizeUrl('x.com/a')).toBe('https://x.com/a')
    expect(normalizeUrl('https://x.com/a')).toBe('https://x.com/a')
    expect(normalizeUrl('  https://x.com/a  ')).toBe('https://x.com/a')
  })
})
