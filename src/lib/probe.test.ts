import { describe, expect, it } from 'vitest'
import fixture from '../test/fixtures/x-video.json'
import { buildAudioOptions, buildVideoOptions, normalizeMedia, presetVideoOptions } from './probe'
import type { RawFormat, RawInfo } from './types'

const xInfo = fixture as unknown as RawInfo
const base = { hasFfmpeg: true, preferredQuality: 'best' as const, platformHint: 'x' as const }

describe('normalizeMedia with a real X payload', () => {
  const media = normalizeMedia(xInfo, base)

  it('keeps platform, author and duration', () => {
    expect(media.platform).toBe('x')
    expect(media.author).toBe('Don Shelby')
    expect(media.authorHandle).toBe('DonShelby_')
    expect(media.durationSec).toBeCloseTo(18.9)
    expect(media.title).toContain('Zidanesca')
  })

  it('builds one quality per resolution, portrait labels included', () => {
    expect(media.videoOptions.map((option) => option.label)).toEqual([
      '1200 × 1500',
      '720 × 900',
      '480 × 600',
      '320 × 400',
    ])
  })

  it('prefers the progressive http stream over the hls variant', () => {
    const best = media.videoOptions[0]!
    expect(best.selector).toBe('http-10368')
    expect(best.needsMerge).toBe(false)
    expect(best.recommended).toBe(true)
    expect(best.isMax).toBe(true)
    expect(best.bitrateKbps).toBe(10368)
    expect(best.sizeBytes).toBe(24_494_399)
  })

  it('estimates audio sizes from the best audio stream', () => {
    const original = media.audioOptions[0]!
    expect(original.label).toBe('Audio original')
    expect(original.bitrateKbps).toBe(128)
    expect(original.sizeBytes).toBe(Math.round((128 * 1000 * 18.9) / 8))
    expect(media.audioOptions.find((option) => option.id === 'a-flac')?.sizeBytes).toBeGreaterThan(0)
  })
})

describe('quality preference', () => {
  it('marks the option closest below 720 as recommended', () => {
    const media = normalizeMedia(xInfo, { ...base, preferredQuality: '720' })
    expect(media.videoOptions.find((option) => option.recommended)?.label).toBe('480 × 600')
  })

  it('still returns progressive options when ffmpeg is missing', () => {
    const media = normalizeMedia(xInfo, { ...base, hasFfmpeg: false })
    expect(media.videoOptions).toHaveLength(4)
    expect(media.videoOptions.every((option) => !option.needsMerge)).toBe(true)
  })
})

describe('buildVideoOptions with separate video and audio streams', () => {
  const formats: RawFormat[] = [
    { format_id: '140', vcodec: 'none', acodec: 'mp4a.40.2', abr: 128, ext: 'm4a', protocol: 'https' },
    {
      format_id: '137',
      vcodec: 'avc1.640028',
      acodec: 'none',
      width: 1920,
      height: 1080,
      fps: 30,
      tbr: 4500,
      ext: 'mp4',
      protocol: 'https',
    },
    {
      format_id: '22',
      vcodec: 'avc1.64001F',
      acodec: 'mp4a.40.2',
      width: 1280,
      height: 720,
      fps: 30,
      tbr: 1500,
      ext: 'mp4',
      protocol: 'https',
    },
    {
      format_id: '18',
      vcodec: 'avc1.42001E',
      acodec: 'mp4a.40.2',
      width: 640,
      height: 360,
      fps: 30,
      tbr: 600,
      ext: 'mp4',
      protocol: 'https',
    },
    { format_id: 'storyboard', ext: 'mhtml', protocol: 'mhtml', width: 160, height: 90 },
  ]

  it('merges video+audio when ffmpeg is available', () => {
    const options = buildVideoOptions(formats, 60, { hasFfmpeg: true, preferredQuality: 'best' })
    const full = options.find((option) => option.height === 1080)!
    expect(full.selector).toBe('137+140')
    expect(full.needsMerge).toBe(true)
    expect(full.codec).toBe('H.264')
    expect(full.sizeBytes).toBe(Math.round((4500 * 1000 * 60) / 8 + (128 * 1000 * 60) / 8))
  })

  it('skips merge-only heights without ffmpeg', () => {
    const options = buildVideoOptions(formats, 60, { hasFfmpeg: false, preferredQuality: 'best' })
    expect(options.map((option) => option.height)).toEqual([720, 360])
  })

  it('ignores storyboard formats', () => {
    const options = buildVideoOptions(formats, 60, { hasFfmpeg: true, preferredQuality: 'best' })
    expect(options.some((option) => option.label === '90p')).toBe(false)
  })
})

describe('playlists', () => {
  const playlist = {
    _type: 'playlist',
    id: 'PL123',
    title: 'Documentales de tecnología',
    uploader: 'TechNova',
    playlist_count: 4,
    entries: [
      { id: 'a', title: 'Uno', url: 'https://youtu.be/a', duration: 60, uploader: 'TechNova' },
      { id: 'b', title: 'Dos', url: 'https://youtu.be/b', duration: 90, uploader: 'TechNova' },
      { id: 'c', title: 'Tres', url: 'https://youtu.be/c', duration: 120, uploader: 'TechNova' },
    ],
  } as unknown as RawInfo

  it('normalizes entries and marks the list as truncated', () => {
    const media = normalizeMedia(playlist, {
      hasFfmpeg: true,
      preferredQuality: 'best',
      platformHint: 'youtube',
    })
    expect(media.playlist?.count).toBe(4)
    expect(media.playlist?.entries).toHaveLength(3)
    expect(media.playlist?.truncated).toBe(true)
    expect(media.playlist?.entries[1]?.index).toBe(1)
  })

  it('uses preset quality selectors instead of per-format options', () => {
    const media = normalizeMedia(playlist, {
      hasFfmpeg: true,
      preferredQuality: 'best',
      platformHint: 'youtube',
    })
    expect(media.videoOptions).toHaveLength(6)
    expect(media.videoOptions[0]?.selector).toContain('bestvideo[height<=2160]')
  })
})

describe('presetVideoOptions', () => {
  it('falls back to progressive selectors without ffmpeg', () => {
    const options = presetVideoOptions(false)
    expect(options[0]?.selector).toBe('best[height<=2160]')
    expect(options[0]?.needsMerge).toBe(false)
  })
})

describe('subtitles', () => {
  it('merges manual and automatic captions with localized names', () => {
    const raw = {
      id: 'x',
      title: 't',
      subtitles: { es: [{ ext: 'vtt' }], en: [{ ext: 'srt' }] },
      automatic_captions: { es: [{ ext: 'vtt' }], de: [{ ext: 'vtt' }] },
    } as unknown as RawInfo
    const media = normalizeMedia(raw, { hasFfmpeg: true, preferredQuality: 'best' })
    const spanish = media.subtitles.find((track) => track.lang === 'es')!
    expect(spanish.auto).toBe(false)
    expect(spanish.name.toLowerCase()).toContain('español')
    expect(media.subtitles.find((track) => track.lang === 'de')?.auto).toBe(true)
  })
})

describe('buildAudioOptions', () => {
  it('flags conversions that need ffmpeg', () => {
    const withSource = buildAudioOptions(
      [{ format_id: '140', vcodec: 'none', acodec: 'mp4a.40.2', abr: 128, ext: 'm4a', protocol: 'https' }],
      30,
    )
    expect(withSource.find((option) => option.id === 'a-best')?.needsFfmpeg).toBe(false)
    expect(withSource.find((option) => option.id === 'a-mp3-320')?.needsFfmpeg).toBe(true)
    expect(withSource.find((option) => option.id === 'a-wav')?.sizeBytes).toBe(
      Math.round((1411 * 1000 * 30) / 8),
    )

    const withoutSource = buildAudioOptions([], 30)
    expect(withoutSource.find((option) => option.id === 'a-best')?.needsFfmpeg).toBe(true)
  })
})
