import { isTauri } from './engine'
import type { RuntimeInfo } from './types'

export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
export const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

export interface UpdateInfo {
  version: string
  currentVersion: string
  notes: string | null
  date: string | null
}

export interface InstallProgress {
  downloaded: number
  total: number | null
  percent: number
}

export function shouldCheck(lastCheck: number | null, now = Date.now()): boolean {
  return !lastCheck || now - lastCheck >= CHECK_INTERVAL_MS
}

export function snoozeUntil(now = Date.now()): number {
  return now + SNOOZE_MS
}

export function isSnoozed(until: number | null, now = Date.now()): boolean {
  return typeof until === 'number' && until > now
}

export function supportsSelfUpdate(runtime: RuntimeInfo | null): boolean {
  return Boolean(runtime?.canSelfUpdate)
}

export function formatLastCheck(timestamp: number | null, now = Date.now()): string {
  if (!timestamp) return 'nunca'
  const diff = Math.max(0, now - timestamp)
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

export function describeInstallKind(kind: RuntimeInfo['installKind'] | undefined): string {
  switch (kind) {
    case 'nsis':
      return 'instalador .exe (por usuario)'
    case 'msi':
      return 'paquete .msi (instalación del sistema)'
    case 'appimage':
      return 'AppImage'
    case 'package':
      return 'paquete del sistema (.deb)'
    case 'dmg':
      return 'imagen .dmg'
    case 'dev':
      return 'desarrollo'
    default:
      return 'desconocida'
  }
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!isTauri) return null
  const { check } = await import('@tauri-apps/plugin-updater')
  const update = await check()
  if (!update) return null

  const info: UpdateInfo = {
    version: update.version,
    currentVersion: update.currentVersion,
    notes: update.body ?? null,
    date: update.date ?? null,
  }

  await update.close().catch(() => undefined)
  return info
}

export async function installUpdate(onProgress: (progress: InstallProgress) => void): Promise<void> {
  const { check } = await import('@tauri-apps/plugin-updater')
  const update = await check()
  if (!update) throw new Error('No hay una actualización disponible.')

  let total: number | null = null
  let downloaded = 0

  await update.downloadAndInstall(
    (event) => {
      if (event.event === 'Started') {
        total = event.data.contentLength ?? null
      } else if (event.event === 'Progress') {
        downloaded += event.data.chunkLength
      } else if (event.event === 'Finished') {
        downloaded = total ?? downloaded
      }

      onProgress({
        downloaded,
        total,
        percent: total ? Math.min(1, downloaded / total) : 0,
      })
    },
    { timeout: 120_000 },
  )
}

export async function relaunchApp(): Promise<void> {
  if (!isTauri) return
  const { relaunch } = await import('@tauri-apps/plugin-process')
  await relaunch()
}
