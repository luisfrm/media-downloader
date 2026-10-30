import { describe, expect, it } from 'vitest'
import { formatBytes, formatCompact, formatDuration, formatEta, formatSpeed, truncateMiddle } from './format'

describe('formatBytes', () => {
  it('formats bytes with Spanish decimal separator', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(23.4 * 1024 * 1024)).toBe('23,4 MB')
    expect(formatBytes(24_494_399)).toBe('23,4 MB')
    expect(formatBytes(1.4 * 1024 ** 3)).toBe('1,4 GB')
  })

  it('returns a dash for missing or invalid values', () => {
    expect(formatBytes(null)).toBe('—')
    expect(formatBytes(0)).toBe('—')
    expect(formatBytes(Number.NaN)).toBe('—')
  })
})

describe('formatDuration', () => {
  it('renders m:ss and h:mm:ss', () => {
    expect(formatDuration(18.9)).toBe('0:19')
    expect(formatDuration(63)).toBe('1:03')
    expect(formatDuration(3661)).toBe('1:01:01')
  })

  it('handles missing duration', () => {
    expect(formatDuration(null)).toBe('—')
    expect(formatDuration(-1)).toBe('—')
  })
})

describe('formatSpeed / formatEta', () => {
  it('formats transfer speed', () => {
    expect(formatSpeed(18.4 * 1024 * 1024)).toBe('18,4 MB/s')
    expect(formatSpeed(0)).toBe('—')
  })

  it('formats eta in human units', () => {
    expect(formatEta(0.4)).toBe('menos de 1 s')
    expect(formatEta(3)).toBe('~3 s')
    expect(formatEta(80)).toBe('~1 min 20 s')
    expect(formatEta(3600)).toBe('~1 h')
  })
})

describe('formatCompact', () => {
  it('compacts view counts using es-ES', () => {
    expect(formatCompact(9220)).toMatch(/9,2\s*mil/)
    expect(formatCompact(1200000)).toMatch(/1,2\s*M/)
  })
})

describe('truncateMiddle', () => {
  it('keeps both ends of long paths', () => {
    expect(truncateMiddle('abcdefghij', 5)).toBe('ab…ij')
    expect(truncateMiddle('short', 10)).toBe('short')
  })
})
