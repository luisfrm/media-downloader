import type {
  AudioOption,
  MediaInfo,
  PlaylistEntry,
  PlaylistInfo,
  Platform,
  RawFormat,
  RawInfo,
  Settings,
  SubtitleTrack,
  VideoOption,
} from './types'
import { detectPlatform } from './platform'

const CODECS: [RegExp, string][] = [
  [/^(avc1|h264)/i, 'H.264'],
  [/^(av01|av1)/i, 'AV1'],
  [/^(hev1|hvc1|hevc)/i, 'HEVC'],
  [/^(vp0?9)/i, 'VP9'],
  [/^(vp0?8)/i, 'VP8'],
  [/^(theora)/i, 'Theora'],
]

export interface BuildOptions {
  hasFfmpeg: boolean
  preferredQuality: Settings['preferredQuality']
  platformHint?: Platform
}

function codecLabel(format: RawFormat): string {
  const codec = format.vcodec ?? ''
  if (!codec || codec === 'none') return 'MP4'
  for (const [pattern, label] of CODECS) {
    if (pattern.test(codec)) return label
  }
  return codec.split('.')[0]!.toUpperCase()
}

function isStoryboard(format: RawFormat): boolean {
  const note = (format.format_note ?? '').toLowerCase()
  const ext = (format.ext ?? '').toLowerCase()
  const protocol = (format.protocol ?? '').toLowerCase()
  return ext === 'mhtml' || note.includes('storyboard') || protocol.includes('mhtml')
}

export function isVideoFormat(format: RawFormat): boolean {
  if (isStoryboard(format)) return false
  if ((format.height ?? 0) > 0) return true
  return Boolean(format.vcodec && format.vcodec !== 'none')
}

export function isMuxedFormat(format: RawFormat): boolean {
  if (!isVideoFormat(format)) return false
  if (format.acodec && format.acodec !== 'none') return true
  const progressive = /^https?/i.test(format.protocol ?? '')
  return progressive && format.acodec == null && format.vcodec == null
}

function bitrateOf(format: RawFormat): number {
  return format.tbr ?? format.vbr ?? format.abr ?? 0
}

function scoreFormat(format: RawFormat): number {
  const codec = format.vcodec ?? ''
  const h264Bonus = /^avc1|^h264/i.test(codec) ? 1.06 : 1
  const fpsBonus = (format.fps ?? 0) >= 50 ? 1.02 : 1
  const muxedBonus = isMuxedFormat(format) ? 1.01 : 1
  return bitrateOf(format) * h264Bonus * fpsBonus * muxedBonus
}

export function estimateFormatBytes(format: RawFormat, durationSec: number): number | null {
  if (format.filesize && format.filesize > 0) return format.filesize
  if (format.filesize_approx && format.filesize_approx > 0) return format.filesize_approx
  const bitrate = bitrateOf(format)
  if (bitrate > 0 && durationSec > 0) return Math.round((bitrate * 1000 * durationSec) / 8)
  return null
}

export function bestAudioFormat(formats: RawFormat[]): RawFormat | null {
  const audios = formats.filter((format) => {
    if (isStoryboard(format)) return false
    if (format.height && format.height > 0) return false
    const hasVideo = Boolean(format.vcodec && format.vcodec !== 'none')
    if (hasVideo) return false
    return Boolean(format.abr || format.tbr || (format.acodec && format.acodec !== 'none'))
  })
  if (!audios.length) return null
  return audios.sort((a, b) => (b.abr ?? bitrateOf(b)) - (a.abr ?? bitrateOf(a)))[0]!
}

function resolutionLabel(width: number, height: number): string {
  if (height > width) return `${width} × ${height}`
  return `${height}p`
}

export function presetVideoOptions(hasFfmpeg: boolean): VideoOption[] {
  const heights = [2160, 1440, 1080, 720, 480, 360]
  return heights.map((height, index) => {
    const selector = hasFfmpeg
      ? `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`
      : `best[height<=${height}]`
    return {
      id: `preset-${height}`,
      label: `${height}p`,
      width: 0,
      height,
      fps: null,
      codec: 'Automático',
      codecRaw: '',
      hdr: false,
      sizeBytes: null,
      bitrateKbps: null,
      selector,
      needsMerge: hasFfmpeg,
      recommended: false,
      isMax: index === 0,
      container: 'auto',
    }
  })
}

export function buildVideoOptions(
  formats: RawFormat[],
  durationSec: number,
  options: BuildOptions,
): VideoOption[] {
  const audio = bestAudioFormat(formats)
  const groups = new Map<number, RawFormat[]>()

  for (const format of formats) {
    if (!isVideoFormat(format)) continue
    const height = Math.round(format.height ?? 0)
    if (height <= 0) continue
    const bucket = groups.get(height) ?? []
    bucket.push(format)
    groups.set(height, bucket)
  }

  const built: VideoOption[] = []

  for (const [height, bucket] of groups) {
    const sorted = [...bucket].sort((a, b) => scoreFormat(b) - scoreFormat(a))
    const best = sorted[0]!
    const muxed = sorted.find(isMuxedFormat) ?? null

    let chosen = best
    let selector = chosen.format_id

    if (options.hasFfmpeg && !isMuxedFormat(best) && audio) {
      selector = `${best.format_id}+${audio.format_id}`
    } else if (isMuxedFormat(best)) {
      selector = best.format_id
    } else if (!options.hasFfmpeg) {
      if (!muxed) continue
      chosen = muxed
      selector = muxed.format_id
    }

    const needsMerge = selector.includes('+')
    const width = chosen.width ?? 0
    const sizeBytes =
      needsMerge && audio
        ? (estimateFormatBytes(chosen, durationSec) ?? 0) +
          (estimateFormatBytes(audio, durationSec) ?? 0)
        : estimateFormatBytes(chosen, durationSec)

    built.push({
      id: `v-${height}-${chosen.format_id}`,
      label: resolutionLabel(width, height),
      width,
      height,
      fps: chosen.fps ?? null,
      codec: codecLabel(chosen),
      codecRaw: chosen.vcodec ?? '',
      hdr: /hdr|hlg|pq/i.test(chosen.dynamic_range ?? ''),
      sizeBytes: sizeBytes && sizeBytes > 0 ? sizeBytes : null,
      bitrateKbps: bitrateOf(chosen) || null,
      selector,
      needsMerge,
      recommended: false,
      isMax: false,
      container: needsMerge ? 'mp4' : (chosen.ext ?? 'mp4'),
    })
  }

  const unique = [...new Map(built.map((option) => [option.height, option])).values()]
  unique.sort((a, b) => b.height - a.height)
  const limited = unique.slice(0, 6)

  if (!limited.length) {
    return markRecommended(presetVideoOptions(options.hasFfmpeg), options.preferredQuality)
  }

  limited[0]!.isMax = true
  return markRecommended(limited, options.preferredQuality)
}

function markRecommended(options: VideoOption[], preference: Settings['preferredQuality']): VideoOption[] {
  if (!options.length) return options
  const target = preference === '720' ? 720 : preference === '1080' ? 1080 : preference === 'best' ? Infinity : 1080
  const candidate = options.find((option) => option.height <= target) ?? options[0]!
  return options.map((option) => ({ ...option, recommended: option.id === candidate.id }))
}

const AUDIO_TARGETS: Array<{
  id: string
  label: string
  detail: string
  format: AudioOption['audioFormat']
  kbps: number | null
  needsFfmpeg: boolean
}> = [
  {
    id: 'a-best',
    label: 'Audio original',
    detail: 'Sin recodificar · mejor pista disponible',
    format: 'best',
    kbps: null,
    needsFfmpeg: false,
  },
  {
    id: 'a-mp3-320',
    label: 'MP3 · 320 kbps',
    detail: 'Máxima compatibilidad',
    format: 'mp3',
    kbps: 320,
    needsFfmpeg: true,
  },
  {
    id: 'a-m4a-256',
    label: 'M4A · 256 kbps',
    detail: 'Eficiente en espacio',
    format: 'm4a',
    kbps: 256,
    needsFfmpeg: true,
  },
  {
    id: 'a-flac',
    label: 'FLAC',
    detail: 'Lossless · sin pérdida',
    format: 'flac',
    kbps: 900,
    needsFfmpeg: true,
  },
  {
    id: 'a-wav',
    label: 'WAV',
    detail: 'Sin compresión · edición',
    format: 'wav',
    kbps: 1411,
    needsFfmpeg: true,
  },
]

export function buildAudioOptions(formats: RawFormat[], durationSec: number): AudioOption[] {
  const source = bestAudioFormat(formats)
  const sourceKbps = source ? (source.abr ?? bitrateOf(source) ?? null) : null
  const sourceBytes = source ? estimateFormatBytes(source, durationSec) : null

  return AUDIO_TARGETS.map((target) => {
    const isOriginal = target.format === 'best'
    const kbps = isOriginal ? sourceKbps : target.kbps
    const sizeBytes = isOriginal
      ? sourceBytes
      : kbps && durationSec > 0
        ? Math.round((kbps * 1000 * durationSec) / 8)
        : null
    return {
      id: target.id,
      label: target.label,
      detail: target.detail,
      audioFormat: target.format,
      bitrateKbps: kbps,
      sizeBytes,
      recommended: isOriginal,
      needsFfmpeg: isOriginal ? !source : true,
    }
  })
}

export function buildSubtitles(raw: RawInfo): SubtitleTrack[] {
  const tracks = new Map<string, SubtitleTrack>()

  const add = (lang: string, entries: { ext: string; name?: string }[], auto: boolean) => {
    const existing = tracks.get(lang)
    const formats = entries.map((entry) => entry.ext)
    if (existing) {
      existing.formats = [...new Set([...existing.formats, ...formats])]
      return
    }
    let name = entries[0]?.name ?? ''
    if (!name) {
      try {
        name = new Intl.DisplayNames(['es'], { type: 'language' }).of(lang) ?? lang.toUpperCase()
      } catch {
        name = lang.toUpperCase()
      }
    }
    tracks.set(lang, { lang, name, auto, formats })
  }

  for (const [lang, entries] of Object.entries(raw.subtitles ?? {})) add(lang, entries, false)
  for (const [lang, entries] of Object.entries(raw.automatic_captions ?? {})) add(lang, entries, true)

  return [...tracks.values()].sort((a, b) => Number(a.auto) - Number(b.auto) || a.lang.localeCompare(b.lang))
}

function pickThumbnail(raw: RawInfo): string {
  if (raw.thumbnail) return raw.thumbnail
  const list = raw.thumbnails ?? []
  if (!list.length) return ''
  return list[list.length - 1]!.url
}

function normalizeEntry(entry: RawInfo, index: number): PlaylistEntry {
  const url = entry.webpage_url ?? entry.original_url ?? entry.url ?? ''
  return {
    id: entry.id,
    title: entry.title ?? 'Sin título',
    url,
    durationSec: entry.duration ?? 0,
    thumbnail: pickThumbnail(entry),
    author: entry.uploader ?? entry.channel ?? '',
    index,
  }
}

function playlistFrom(raw: RawInfo): PlaylistInfo | null {
  const entries = raw.entries ?? []
  if (!entries.length) return null
  const count = Math.max(entries.length, raw.playlist_count ?? entries.length)
  return {
    count,
    entries: entries.map((entry, index) => normalizeEntry(entry, index)),
    truncated: count > entries.length,
  }
}

export function normalizeMedia(raw: RawInfo, options: BuildOptions): MediaInfo {
  const formats = raw.formats ?? []
  const playlist = playlistFrom(raw)
  const platform = options.platformHint ?? detectPlatform(raw.webpage_url ?? raw.original_url ?? '')

  const videoOptions = playlist
    ? markRecommended(presetVideoOptions(options.hasFfmpeg), options.preferredQuality)
    : buildVideoOptions(formats, raw.duration ?? 0, options)

  return {
    id: raw.id ?? '',
    url: raw.webpage_url ?? raw.original_url ?? '',
    title: raw.title ?? 'Sin título',
    description: raw.description ?? '',
    author: raw.uploader ?? raw.channel ?? '',
    authorHandle: raw.uploader_id ?? '',
    platform,
    durationSec: raw.duration ?? 0,
    thumbnail: pickThumbnail(raw),
    viewCount: raw.view_count ?? null,
    likeCount: raw.like_count ?? null,
    publishedAt: raw.upload_date ?? null,
    isLive: raw.is_live ?? false,
    ageRestricted: (raw.age_limit ?? 0) >= 18,
    videoOptions,
    audioOptions: buildAudioOptions(formats, raw.duration ?? 0),
    subtitles: buildSubtitles(raw),
    playlist,
  }
}

export function isPlaylistPayload(raw: RawInfo): boolean {
  return raw._type === 'playlist' || Array.isArray(raw.entries)
}
