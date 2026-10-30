import { describe, expect, it } from 'vitest'
import { toPlaylistRanges } from './selection'

describe('toPlaylistRanges', () => {
  it('returns an empty string when nothing is selected', () => {
    expect(toPlaylistRanges([])).toBe('')
  })

  it('collapses consecutive runs', () => {
    expect(toPlaylistRanges([1, 2, 3, 5, 6, 8])).toBe('1-3,5-6,8')
  })

  it('deduplicates and sorts input', () => {
    expect(toPlaylistRanges([9, 1, 2, 2, 3])).toBe('1-3,9')
  })

  it('leaves a single item without range syntax', () => {
    expect(toPlaylistRanges([4])).toBe('4')
    expect(toPlaylistRanges([4, 7, 8])).toBe('4,7-8')
  })
})
