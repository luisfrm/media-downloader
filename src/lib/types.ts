export type Platform = 'youtube' | 'x' | 'instagram' | 'tiktok' | 'facebook' | 'other'

export type DownloadMode = 'video' | 'audio' | 'thumbnail' | 'subtitles'

export type JobPhase =
  | 'queued'
  | 'fetching'
  | 'downloading'
  | 'processing'
  | 'done'
  | 'paused'
  | 'error'
  | 'canceled'

export interface RawFormat {
  format_id: string
  format_note?: string | null
  ext?: string | null
  protocol?: string | null
  vcodec?: string | null
  acodec?: string | null
  width?: number | null
  height?: number | null
  fps?: number | null
  tbr?: number | null
  vbr?: number | null
  abr?: number | null
  filesize?: number | null
  filesize_approx?: number | null
  dynamic_range?: string | null
  language?: string | null
  audio_channels?: number | null
}

export interface RawSubtitle {
  ext: string
  name?: string
  url?: string
}

export interface RawInfo {
  _type?: string
  id: string
  title: string
  description?: string
  uploader?: string | null
  uploader_id?: string | null
  channel?: string | null
  duration?: number | null
  thumbnail?: string | null
  thumbnails?: { url: string; width?: number; height?: number }[]
  view_count?: number | null
  like_count?: number | null
  upload_date?: string | null
  timestamp?: number | null
  extractor_key?: string | null
  extractor?: string | null
  webpage_url?: string | null
  original_url?: string | null
  url?: string
  is_live?: boolean
  age_limit?: number
  formats?: RawFormat[]
  subtitles?: Record<string, RawSubtitle[]>
  automatic_captions?: Record<string, RawSubtitle[]>
  entries?: RawInfo[]
  playlist_count?: number | null
  availability?: string | null
}

export interface VideoOption {
  id: string
  label: string
  width: number
  height: number
  fps: number | null
  codec: string
  codecRaw: string
  hdr: boolean
  sizeBytes: number | null
  bitrateKbps: number | null
  selector: string
  needsMerge: boolean
  recommended: boolean
  isMax: boolean
  container: string
}

export interface AudioOption {
  id: string
  label: string
  detail: string
  audioFormat: 'best' | 'mp3' | 'm4a' | 'flac' | 'wav'
  bitrateKbps: number | null
  sizeBytes: number | null
  recommended: boolean
  needsFfmpeg: boolean
}

export interface SubtitleTrack {
  lang: string
  name: string
  auto: boolean
  formats: string[]
}

export interface PlaylistEntry {
  id: string
  title: string
  url: string
  durationSec: number
  thumbnail: string
  author: string
  index: number
}

export interface PlaylistInfo {
  count: number
  entries: PlaylistEntry[]
  truncated: boolean
}

export interface MediaInfo {
  id: string
  url: string
  title: string
  description: string
  author: string
  authorHandle: string
  platform: Platform
  durationSec: number
  thumbnail: string
  viewCount: number | null
  likeCount: number | null
  publishedAt: string | null
  isLive: boolean
  ageRestricted: boolean
  videoOptions: VideoOption[]
  audioOptions: AudioOption[]
  subtitles: SubtitleTrack[]
  playlist: PlaylistInfo | null
}

export interface DownloadJob {
  id: string
  url: string
  title: string
  author: string
  platform: Platform
  thumbnail: string
  mode: DownloadMode
  qualityLabel: string
  detail: string
  outputDir: string
  phase: JobPhase
  progress: number
  downloadedBytes: number
  totalBytes: number | null
  speedBps: number | null
  etaSec: number | null
  filePath: string | null
  error: string | null
  createdAt: number
  finishedAt: number | null
  playlistTotal: number | null
  args: string[]
}

export interface Settings {
  downloadDir: string
  preferredQuality: 'best' | '1080' | '720' | 'audio'
  concurrency: number
  clipboardWatch: boolean
  filenameTemplate: string
  embedThumbnail: boolean
  embedMetadata: boolean
  cookiesFromBrowser: 'none' | 'chrome' | 'firefox' | 'edge' | 'brave' | 'safari'
  reduceMotion: boolean
}

export interface EngineCapabilities {
  ytdlp: string | null
  ffmpeg: string | null
  binDir: string
  platform: string
  defaultDir: string
}

export interface EngineEvent {
  type: 'progress' | 'phase' | 'log'
  id: string
  downloadedBytes?: number
  totalBytes?: number | null
  speedBps?: number | null
  etaSec?: number | null
  percent?: number
  phase?: JobPhase
  filePath?: string | null
  message?: string
}

export interface ProbePayload {
  info: RawInfo
  isPlaylist: boolean
}
