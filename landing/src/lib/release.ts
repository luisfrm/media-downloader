import raw from '../data/release.json'

export interface ReleaseAsset {
  name: string
  url: string
  size: number
}

export interface Release {
  version: string
  tag: string
  publishedAt: string
  releaseUrl: string
  assets: Record<string, ReleaseAsset>
  checksums: string | null
  installGuide: string | null
  source: 'github' | 'fallback'
}

export const release = raw as Release

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—'
  const mb = bytes / 1024 / 1024
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`
}

const dateFormatter = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatDate(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.valueOf()) ? '' : dateFormatter.format(date)
}

export function asset(key: string): ReleaseAsset | null {
  return release.assets[key] ?? null
}

export function releaseDate(): string {
  return formatDate(release.publishedAt)
}
