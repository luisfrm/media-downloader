import { describe, expect, it } from 'vitest'
import {
  buildConvertArgs,
  buildDownloadArgs,
  buildProbeArgs,
  detectPostProcess,
  parseFilePathLine,
  parseProgressLine,
} from './ytdlp'

const url = 'https://x.com/DonShelby_/status/2116216248291754237'

describe('buildProbeArgs', () => {
  it('probes a single video by default', () => {
    const args = buildProbeArgs(url)
    expect(args).toContain('-J')
    expect(args).toContain('--no-playlist')
    expect(args.at(-1)).toBe(url)
    expect(args.join(' ')).not.toContain('--cookies-from-browser')
  })

  it('adds flat playlist flags', () => {
    const args = buildProbeArgs(url, { playlist: true, playlistLimit: 50 })
    expect(args).toContain('--flat-playlist')
    expect(args).toContain('--playlist-end')
    expect(args[args.indexOf('--playlist-end') + 1]).toBe('50')
  })

  it('reads cookies when configured', () => {
    const args = buildProbeArgs(url, { cookiesFromBrowser: 'firefox' })
    expect(args).toContain('--cookies-from-browser')
    expect(args[args.indexOf('--cookies-from-browser') + 1]).toBe('firefox')
  })
})

describe('buildDownloadArgs', () => {
  const base = {
    url,
    outputDir: 'C:\\Users\\demo\\Downloads',
    mode: 'video' as const,
    selector: 'http-10368',
    container: 'mp4',
    filenameTemplate: '%(title)s.%(ext)s',
  }

  it('builds a video download with progress template and output dir', () => {
    const args = buildDownloadArgs(base)
    expect(args).toContain('-f')
    expect(args[args.indexOf('-f') + 1]).toBe('http-10368')
    expect(args[args.indexOf('-P') + 1]).toBe(base.outputDir)
    expect(args[args.indexOf('-o') + 1]).toBe(base.filenameTemplate)
    expect(args).toContain('--progress-template')
    expect(args).toContain('--merge-output-format')
    expect(args.at(-1)).toBe(url)
  })

  it('skips remuxing when the source already matches the container', () => {
    const args = buildDownloadArgs({
      ...base,
      naturalContainer: 'mp4',
      needsMerge: false,
      container: 'mp4',
    })
    expect(args).not.toContain('--merge-output-format')
    expect(args).not.toContain('--remux-video')
  })

  it('remuxes when the requested container differs from the source', () => {
    const args = buildDownloadArgs({
      ...base,
      naturalContainer: 'webm',
      needsMerge: true,
      container: 'mp4',
    })
    expect(args[args.indexOf('--merge-output-format') + 1]).toBe('mp4')
    expect(args[args.indexOf('--remux-video') + 1]).toBe('mp4')
  })

  it('builds an audio extraction', () => {
    const args = buildDownloadArgs({
      ...base,
      mode: 'audio',
      audioFormat: 'mp3',
      audioBitrate: '320K',
    })
    expect(args).toContain('-x')
    expect(args[args.indexOf('--audio-format') + 1]).toBe('mp3')
    expect(args[args.indexOf('--audio-quality') + 1]).toBe('320K')
    expect(args).not.toContain('--merge-output-format')
  })

  it('builds a thumbnail download without the media file', () => {
    const args = buildDownloadArgs({ ...base, mode: 'thumbnail' })
    expect(args).toContain('--skip-download')
    expect(args).toContain('--write-thumbnail')
    expect(args).toContain('--convert-thumbnails')
  })

  it('restricts playlist items', () => {
    const args = buildDownloadArgs({
      ...base,
      playlist: true,
      playlistItems: '1-3,7',
      mode: 'video',
    })
    expect(args).toContain('--yes-playlist')
    expect(args[args.indexOf('--playlist-items') + 1]).toBe('1-3,7')
  })

  it('adds subtitle flags when embedding', () => {
    const args = buildDownloadArgs({
      ...base,
      subtitleEmbed: true,
      subtitleLangs: ['es', 'en'],
      subtitleFormat: 'vtt',
      subtitleAuto: true,
    })
    expect(args).toContain('--embed-subs')
    expect(args[args.indexOf('--sub-langs') + 1]).toBe('es,en')
    expect(args).toContain('--write-auto-subs')
  })
})

describe('parseProgressLine', () => {
  it('parses our progress template', () => {
    const parsed = parseProgressLine('dl|1000|2000|NA|500.5|3|50')
    expect(parsed).toEqual({
      downloadedBytes: 1000,
      totalBytes: 2000,
      speedBps: 500.5,
      etaSec: 3,
      percent: 0.5,
    })
  })

  it('falls back to the estimate and computes the percentage', () => {
    const parsed = parseProgressLine('dl|250|NA|1000|NA|NA|NA')!
    expect(parsed.totalBytes).toBe(1000)
    expect(parsed.percent).toBe(0.25)
  })

  it('normalizes percentages expressed as 0-100', () => {
    expect(parseProgressLine('dl|0|0|0|0|0|42')?.percent).toBeCloseTo(0.42)
  })

  it('ignores unrelated lines', () => {
    expect(parseProgressLine('[download] 10% of 1MiB')).toBeNull()
  })
})

describe('detectPostProcess', () => {
  it('detects merging and conversion phases', () => {
    expect(detectPostProcess('[Merger] Merging formats into "a.mp4"')).toBe('processing')
    expect(detectPostProcess('[ExtractAudio] Destination: a.mp3')).toBe('processing')
    expect(detectPostProcess('[download] Destination: a.mp4')).toBeNull()
  })
})

describe('parseFilePathLine', () => {
  it('accepts absolute windows and unix paths', () => {
    expect(parseFilePathLine('C:\\Users\\demo\\a.mp4')).toBe('C:\\Users\\demo\\a.mp4')
    expect(parseFilePathLine('/home/demo/a.mp4')).toBe('/home/demo/a.mp4')
  })

  it('rejects log lines', () => {
    expect(parseFilePathLine('[download] Destination: a.mp4')).toBeNull()
  })
})

describe('buildConvertArgs', () => {
  it('extracts audio to mp3', () => {
    const args = buildConvertArgs({ input: 'C:\\Videos\\clip.mov', outputDir: '', format: 'mp3' })
    expect(args).toContain('-vn')
    expect(args.join(' ')).toContain('libmp3lame')
    expect(args.at(-1)).toContain('.converted.mp3')
  })

  it('converts video with a crf', () => {
    const args = buildConvertArgs({ input: '/tmp/clip.mov', outputDir: '', format: 'mp4', quality: 'high' })
    expect(args.join(' ')).toContain('-crf 18')
    expect(args.at(-1)).toContain('.converted.mp4')
  })
})
