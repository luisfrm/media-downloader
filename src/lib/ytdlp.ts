import type { DownloadMode, Settings } from './types.ts'

export const DEFAULT_FILENAME_TEMPLATE = '%(title).140B [%(id)s].%(ext)s'

export const PROGRESS_PREFIX = 'dl|'
export const PROGRESS_TEMPLATE =
  'download:dl|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s|%(progress.percent)s'

export interface ProbeOptions {
  playlist?: boolean
  playlistLimit?: number
  cookiesFromBrowser?: Settings['cookiesFromBrowser']
}

export function buildProbeArgs(url: string, options: ProbeOptions = {}): string[] {
  const args = ['--no-warnings', '--no-check-formats', '--socket-timeout', '20']
  if (options.cookiesFromBrowser && options.cookiesFromBrowser !== 'none') {
    args.push('--cookies-from-browser', options.cookiesFromBrowser)
  }
  args.push('-J')
  if (options.playlist) {
    args.push('--flat-playlist', '--playlist-end', String(options.playlistLimit ?? 200))
  } else {
    args.push('--no-playlist')
  }
  args.push(url)
  return args
}

export interface DownloadSpec {
  url: string
  outputDir: string
  mode: DownloadMode
  selector?: string
  container?: string
  naturalContainer?: string
  needsMerge?: boolean
  audioFormat?: 'best' | 'mp3' | 'm4a' | 'flac' | 'wav'
  audioBitrate?: string
  playlist?: boolean
  playlistItems?: string
  filenameTemplate?: string
  embedThumbnail?: boolean
  embedMetadata?: boolean
  subtitleLangs?: string[]
  subtitleFormat?: 'srt' | 'vtt'
  subtitleEmbed?: boolean
  subtitleAuto?: boolean
  ffmpegDir?: string | null
  cookiesFromBrowser?: Settings['cookiesFromBrowser']
  windowsFilenames?: boolean
  concurrency?: number
}

export function buildDownloadArgs(spec: DownloadSpec): string[] {
  const args = [
    '--no-warnings',
    '--no-quiet',
    '--newline',
    '--no-mtime',
    '--no-cache-dir',
    '--trim-filenames',
    '180',
    '--progress-template',
    PROGRESS_TEMPLATE,
    '--print',
    'after_move:filepath',
    '-P',
    spec.outputDir,
    '-o',
    spec.filenameTemplate?.trim() || DEFAULT_FILENAME_TEMPLATE,
  ]

  if (spec.ffmpegDir) args.push('--ffmpeg-location', spec.ffmpegDir)
  if (spec.cookiesFromBrowser && spec.cookiesFromBrowser !== 'none') {
    args.push('--cookies-from-browser', spec.cookiesFromBrowser)
  }
  if (spec.windowsFilenames) args.push('--windows-filenames')
  if (spec.concurrency && spec.concurrency > 1) {
    args.push('--concurrent-fragments', String(spec.concurrency))
  }

  if (spec.playlist) {
    args.push('--yes-playlist')
    if (spec.playlistItems) args.push('--playlist-items', spec.playlistItems)
  } else {
    args.push('--no-playlist')
  }

  switch (spec.mode) {
    case 'video': {
      args.push('-f', spec.selector || 'bestvideo*+bestaudio/best')
      if (spec.container && spec.container !== 'auto') {
        if (spec.needsMerge ?? true) args.push('--merge-output-format', spec.container)
        if (spec.naturalContainer && spec.naturalContainer !== spec.container) {
          args.push('--remux-video', spec.container)
        }
      }
      if (spec.embedThumbnail) args.push('--embed-thumbnail')
      if (spec.embedMetadata) args.push('--add-metadata')
      if (spec.subtitleEmbed && spec.subtitleLangs?.length) {
        args.push('--write-subs', '--embed-subs', '--sub-langs', spec.subtitleLangs.join(','))
        if (spec.subtitleAuto) args.push('--write-auto-subs')
      }
      break
    }
    case 'audio': {
      args.push('-f', 'bestaudio/best')
      args.push('-x', '--audio-format', spec.audioFormat ?? 'mp3')
      args.push('--audio-quality', spec.audioBitrate ?? '0')
      if (spec.embedMetadata) args.push('--add-metadata')
      if (spec.embedThumbnail) args.push('--embed-thumbnail')
      break
    }
    case 'thumbnail': {
      args.push('--skip-download', '--write-thumbnail', '--convert-thumbnails', 'jpg')
      break
    }
    case 'subtitles': {
      args.push('--skip-download', '--write-subs')
      if (spec.subtitleAuto) args.push('--write-auto-subs')
      if (spec.subtitleLangs?.length) args.push('--sub-langs', spec.subtitleLangs.join(','))
      args.push('--sub-format', spec.subtitleFormat ?? 'srt')
      args.push('--convert-subs', spec.subtitleFormat ?? 'srt')
      break
    }
  }

  args.push(spec.url)
  return args
}

export interface ConvertSpec {
  input: string
  outputDir: string
  format: 'mp4' | 'mkv' | 'webm' | 'mp3' | 'm4a' | 'wav' | 'gif'
  quality?: 'high' | 'balanced' | 'small'
}

export function buildConvertArgs(spec: ConvertSpec): string[] {
  const args = ['-hide_banner', '-y', '-i', spec.input, '-progress', 'pipe:1', '-nostats']
  const ext = spec.format

  if (ext === 'mp3' || ext === 'm4a' || ext === 'wav') {
    if (ext === 'mp3') args.push('-vn', '-c:a', 'libmp3lame', '-b:a', spec.quality === 'small' ? '160k' : '320k')
    if (ext === 'm4a') args.push('-vn', '-c:a', 'aac', '-b:a', spec.quality === 'small' ? '128k' : '256k')
    if (ext === 'wav') args.push('-vn', '-c:a', 'pcm_s16le')
  } else if (ext === 'gif') {
    args.push('-vf', 'fps=15,scale=720:-1:flags=lanczos', '-loop', '0')
  } else {
    args.push('-c:v', 'libx264', '-preset', spec.quality === 'small' ? 'slow' : 'medium')
    args.push('-crf', spec.quality === 'small' ? '26' : spec.quality === 'high' ? '18' : '22')
    args.push('-c:a', 'aac', '-b:a', '192k')
    if (ext === 'webm') args.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0')
  }

  const base = spec.input.replace(/\.[^./\\]+$/, '')
  args.push(`${base}.converted.${ext}`)
  return args
}

export interface ParsedProgress {
  downloadedBytes: number
  totalBytes: number | null
  speedBps: number | null
  etaSec: number | null
  percent: number
}

function num(value: string | undefined): number | null {
  if (!value || value === 'NA' || value === 'None' || value === 'null') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseProgressLine(line: string): ParsedProgress | null {
  if (!line.startsWith(PROGRESS_PREFIX)) return null
  const parts = line.slice(PROGRESS_PREFIX.length).split('|')
  const downloaded = num(parts[0]) ?? 0
  const total = num(parts[1]) ?? num(parts[2])
  const speed = num(parts[3])
  const eta = num(parts[4])
  let percent = num(parts[5])

  if (percent == null) {
    percent = total && total > 0 ? (downloaded / total) * 100 : 0
  }
  if (percent > 1.0001) percent = percent / 100

  return {
    downloadedBytes: Math.max(0, Math.round(downloaded)),
    totalBytes: total && total > 0 ? Math.round(total) : null,
    speedBps: speed && speed > 0 ? speed : null,
    etaSec: eta && eta >= 0 ? eta : null,
    percent: Math.max(0, Math.min(1, percent ?? 0)),
  }
}

export function detectPostProcess(line: string): 'processing' | null {
  if (/\[(Merger|ExtractAudio|VideoConvertor|VideoRemuxer|EmbedThumbnail|Metadata|FixupM3u8|FixupM4a)\]/i.test(line)) {
    return 'processing'
  }
  return null
}

export function parseFilePathLine(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  const looksLikePath =
    /^[a-zA-Z]:[\\/]/.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('\\\\')
  if (!looksLikePath) return null
  return trimmed
}
