import type { Platform } from './types'

export interface PlatformMeta {
  id: Platform
  name: string
  short: string
  hint: string
  capabilities: string
  tint: string
  hosts: RegExp
}

const meta: Record<Platform, Omit<PlatformMeta, 'hosts'>> = {
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    short: 'YT',
    hint: 'Videos, Shorts y playlists',
    capabilities: '4K · MP3 · listas',
    tint: '#ff3d3d',
  },
  x: {
    id: 'x',
    name: 'X',
    short: 'X',
    hint: 'Clips y GIF de posts',
    capabilities: 'MP4 directo',
    tint: '#e7e9ea',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    short: 'IG',
    hint: 'Reels, carruseles e historias',
    capabilities: 'Multi-slide',
    tint: '#e1306c',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    short: 'TT',
    hint: 'Videos verticales sin marca de agua',
    capabilities: 'Sin watermark',
    tint: '#25f4ee',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    short: 'FB',
    hint: 'Reels, Watch y videos de grupos',
    capabilities: 'Watch · Reels',
    tint: '#1877f2',
  },
  other: {
    id: 'other',
    name: 'Enlace genérico',
    short: 'URL',
    hint: 'Cualquier sitio soportado por yt-dlp',
    capabilities: '1.400+ sitios',
    tint: '#9eaec4',
  },
}

export const PLATFORM_ORDER: Platform[] = ['youtube', 'tiktok', 'instagram', 'x', 'facebook']

export const PLATFORMS: Record<Platform, PlatformMeta> = {
  youtube: { ...meta.youtube, hosts: /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i },
  x: { ...meta.x, hosts: /(^|\.)(x\.com|twitter\.com|t\.co)$/i },
  instagram: { ...meta.instagram, hosts: /(^|\.)(instagram\.com|instagr\.am)$/i },
  tiktok: { ...meta.tiktok, hosts: /(^|\.)(tiktok\.com|vt\.tiktok\.com)$/i },
  facebook: { ...meta.facebook, hosts: /(^|\.)(facebook\.com|fb\.watch|fb\.com)$/i },
  other: { ...meta.other, hosts: /.*/ },
}

export function detectPlatform(input: string): Platform {
  const value = input.trim()
  if (!value) return 'other'

  let host = ''
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`
    host = new URL(withProtocol).hostname.replace(/^www\./i, '')
  } catch {
    return 'other'
  }

  for (const platform of PLATFORM_ORDER) {
    if (PLATFORMS[platform].hosts.test(host)) return platform
  }
  return 'other'
}

export function looksLikeUrl(input: string): boolean {
  const value = input.trim()
  if (!value || /\s/.test(value)) return false
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`
    const url = new URL(withProtocol)
    return url.hostname.includes('.')
  } catch {
    return false
  }
}

export function normalizeUrl(input: string): string {
  const value = input.trim()
  if (!value) return value
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`
}

export function extractAvatarInitial(author: string): string {
  const clean = author.trim()
  return clean ? clean[0]!.toUpperCase() : '?'
}
