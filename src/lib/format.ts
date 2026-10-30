const ES = 'es-ES'

export function formatBytes(bytes?: number | null, decimals?: number): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits =
    decimals ?? (value >= 100 ? 0 : value >= 10 ? 1 : value >= 1 ? (Number.isInteger(value) ? 0 : 1) : 2)
  return `${value.toFixed(digits).replace('.', ',')} ${units[unit]}`
}

export function formatDuration(seconds?: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—'
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatSpeed(bytesPerSecond?: number | null): string {
  if (bytesPerSecond == null || !Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '—'
  return `${formatBytes(bytesPerSecond)}/s`
}

export function formatEta(seconds?: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < 1) return 'menos de 1 s'
  if (seconds < 60) return `~${Math.round(seconds)} s`
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return s > 0 ? `~${m} min ${s} s` : `~${m} min`
  }
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return m > 0 ? `~${h} h ${m} min` : `~${h} h`
}

export function formatCompact(value?: number | null): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return '—'
  return new Intl.NumberFormat(ES, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function formatCount(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(ES).format(value)
}

export function formatUploadDate(value?: string | null): string | null {
  if (!value || !/^\d{8}$/.test(value)) return null
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6)) - 1
  const day = Number(value.slice(6, 8))
  const date = new Date(year, month, day)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(ES, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export function formatRelative(timestamp?: number | null): string | null {
  if (!timestamp || !Number.isFinite(timestamp)) return null
  const diffMs = timestamp * 1000 - Date.now()
  const abs = Math.abs(diffMs)
  const rtf = new Intl.RelativeTimeFormat(ES, { numeric: 'auto' })
  if (abs < 60_000) return rtf.format(Math.round(diffMs / 1000), 'second')
  if (abs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), 'minute')
  if (abs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), 'hour')
  if (abs < 2_592_000_000) return rtf.format(Math.round(diffMs / 86_400_000), 'day')
  if (abs < 31_536_000_000) return rtf.format(Math.round(diffMs / 2_592_000_000), 'month')
  return rtf.format(Math.round(diffMs / 31_536_000_000), 'year')
}

export function formatPercent(value: number): string {
  const clamped = Math.max(0, Math.min(1, value))
  return `${Math.round(clamped * 100)}%`
}

export function truncateMiddle(value: string, max = 46): string {
  if (value.length <= max) return value
  const keep = Math.floor((max - 1) / 2)
  return `${value.slice(0, keep)}…${value.slice(-keep)}`
}

export function timeAgo(createdAt: number): string {
  const diff = Math.max(0, Date.now() - createdAt)
  if (diff < 60_000) return 'recién'
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)} h`
  return `hace ${Math.floor(diff / 86_400_000)} d`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
