import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { openPath as openerOpenPath, openUrl as openerOpenUrl, revealItemInDir } from '@tauri-apps/plugin-opener'
import { readText as clipboardReadText, writeText as clipboardWriteText } from '@tauri-apps/plugin-clipboard-manager'
import type { EngineCapabilities, EngineEvent } from './types'

export const isTauri =
  typeof window !== 'undefined' && Object.prototype.hasOwnProperty.call(window, '__TAURI_INTERNALS__')

type Listener = (event: EngineEvent) => void

const listeners = new Set<Listener>()
let polling = false
let pollTimer: number | null = null
let pollGeneration = 0
const lastSeq = new Map<string, number>()

function emit(event: EngineEvent) {
  for (const listener of listeners) listener(event)
}

async function api<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(pathname, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>
  if (!response.ok) throw new Error(payload.error || `Error ${response.status}`)
  return payload as T
}

async function pollJobs(generation: number) {
  if (!polling || generation !== pollGeneration) return
  try {
    const { jobs } = await api<{
      jobs: Array<{
        id: string
        seq: number
        phase: EngineEvent['phase']
        percent: number
        downloadedBytes: number
        totalBytes: number | null
        speedBps: number | null
        etaSec: number | null
        filePath: string | null
        error: string | null
      }>
    }>('/api/jobs')

    for (const job of jobs) {
      if (lastSeq.get(job.id) === job.seq) continue
      lastSeq.set(job.id, job.seq)
      emit({
        type: 'progress',
        id: job.id,
        phase: job.phase,
        percent: job.percent,
        downloadedBytes: job.downloadedBytes,
        totalBytes: job.totalBytes,
        speedBps: job.speedBps,
        etaSec: job.etaSec,
        filePath: job.filePath,
        message: job.error ?? undefined,
      })
    }
  } catch {
    // dev server may be restarting
  }
  if (!polling || generation !== pollGeneration) return
  pollTimer = window.setTimeout(() => void pollJobs(generation), 500)
}

function startPolling() {
  if (polling) return
  polling = true
  pollGeneration += 1
  void pollJobs(pollGeneration)
}

function stopPolling() {
  polling = false
  pollGeneration += 1
  if (pollTimer) window.clearTimeout(pollTimer)
  pollTimer = null
}

let tauriUnlisten: (() => void) | null = null

export async function subscribe(listener: Listener): Promise<() => void> {
  listeners.add(listener)

  if (isTauri) {
    if (!tauriUnlisten) {
      tauriUnlisten = await listen<EngineEvent>('engine://event', (event) => {
        for (const item of listeners) item(event.payload)
      })
    }
  } else {
    startPolling()
  }

  return () => {
    listeners.delete(listener)
    if (!isTauri && listeners.size === 0) stopPolling()
  }
}

export async function capabilities(): Promise<EngineCapabilities> {
  if (isTauri) return invoke<EngineCapabilities>('capabilities')
  return api<EngineCapabilities>('/api/health', { method: 'GET' })
}

export async function probe(args: string[]): Promise<unknown> {
  if (isTauri) return invoke<unknown>('probe', { args })
  const result = await api<{ data: unknown }>('/api/probe', {
    method: 'POST',
    body: JSON.stringify({ args }),
  })
  return result.data
}

export async function startDownload(id: string, args: string[]): Promise<void> {
  if (isTauri) {
    await invoke('start_download', { id, args })
    return
  }
  await api('/api/downloads', { method: 'POST', body: JSON.stringify({ id, args }) })
}

export async function pauseDownload(id: string): Promise<void> {
  if (isTauri) {
    await invoke('pause_download', { id })
    return
  }
  await api(`/api/downloads/${id}/pause`, { method: 'POST' })
}

export async function cancelDownload(id: string): Promise<void> {
  if (isTauri) {
    await invoke('cancel_download', { id })
    return
  }
  await api(`/api/downloads/${id}/cancel`, { method: 'POST' })
}

export async function convert(id: string, args: string[]): Promise<void> {
  if (isTauri) {
    await invoke('convert', { id, args })
    return
  }
  await api('/api/convert', { method: 'POST', body: JSON.stringify({ id, args }) })
}

export async function pickFolder(current?: string): Promise<string | null> {
  if (!isTauri) return null
  const result = await openDialog({
    directory: true,
    multiple: false,
    defaultPath: current,
    title: 'Elegir carpeta de descargas',
  })
  return typeof result === 'string' ? result : null
}

export async function pickFile(current?: string): Promise<string | null> {
  if (!isTauri) return null
  const result = await openDialog({
    directory: false,
    multiple: false,
    defaultPath: current,
    title: 'Elegir archivo para convertir',
    filters: [
      {
        name: 'Audio y video',
        extensions: ['mp4', 'mkv', 'mov', 'webm', 'avi', 'm4v', 'mp3', 'm4a', 'wav', 'flac', 'ogg', 'opus'],
      },
    ],
  })
  return typeof result === 'string' ? result : null
}

export async function openPath(target: string): Promise<void> {
  if (isTauri) {
    await openerOpenPath(target)
    return
  }
  await api('/api/open', { method: 'POST', body: JSON.stringify({ path: target }) })
}

export async function revealPath(target: string): Promise<void> {
  if (isTauri) {
    await revealItemInDir(target)
    return
  }
  await openPath(target)
}

export async function openExternal(url: string): Promise<void> {
  if (isTauri) {
    await openerOpenUrl(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function readClipboard(): Promise<string> {
  if (isTauri) return clipboardReadText()
  return navigator.clipboard.readText()
}

export async function writeClipboard(value: string): Promise<void> {
  if (isTauri) {
    await clipboardWriteText(value)
    return
  }
  await navigator.clipboard.writeText(value)
}

export async function loadSettings(): Promise<Record<string, unknown> | null> {
  if (!isTauri) return null
  return invoke<Record<string, unknown> | null>('load_settings')
}

export async function saveSettings(settings: unknown): Promise<void> {
  if (!isTauri) return
  await invoke('save_settings', { settings })
}

export function platformName(): 'macos' | 'windows' | 'linux' {
  const ua = navigator.userAgent
  if (/Mac/i.test(ua)) return 'macos'
  if (/Win/i.test(ua)) return 'windows'
  return 'linux'
}
