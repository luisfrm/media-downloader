import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as engine from '../lib/engine'
import type { DownloadJob, DownloadMode, EngineEvent, JobPhase, Platform } from '../lib/types'
import { useAppStore } from './useAppStore'

const ACTIVE: JobPhase[] = ['fetching', 'downloading', 'processing']

export interface HistoryItem {
  id: string
  title: string
  author: string
  platform: Platform
  thumbnail: string
  mode: DownloadMode
  qualityLabel: string
  outputDir: string
  filePath: string | null
  sizeBytes: number | null
  finishedAt: number
}

export interface EnqueueInput {
  url: string
  title: string
  author: string
  platform: Platform
  thumbnail: string
  mode: DownloadMode
  qualityLabel: string
  detail: string
  outputDir: string
  totalBytes?: number | null
  playlistTotal?: number | null
  args: string[]
}

interface DownloadsState {
  jobs: DownloadJob[]
  history: HistoryItem[]
  hydrated: boolean
  enqueue: (input: EnqueueInput) => string
  applyEvent: (event: EngineEvent) => void
  pause: (id: string) => Promise<void>
  resume: (id: string) => Promise<void>
  cancel: (id: string) => Promise<void>
  retry: (id: string) => void
  remove: (id: string) => void
  clearFinished: () => void
  clearHistory: () => void
  openJob: (id: string) => Promise<void>
}

function toHistory(job: DownloadJob): HistoryItem {
  return {
    id: job.id,
    title: job.title,
    author: job.author,
    platform: job.platform,
    thumbnail: job.thumbnail,
    mode: job.mode,
    qualityLabel: job.qualityLabel,
    outputDir: job.outputDir,
    filePath: job.filePath,
    sizeBytes: job.totalBytes ?? job.downloadedBytes ?? null,
    finishedAt: job.finishedAt ?? Date.now(),
  }
}

type Setter = (fn: (state: DownloadsState) => Partial<DownloadsState>) => void
type Getter = () => DownloadsState

function schedule(set: Setter, get: Getter) {
  const state = get()
  const limit = Math.max(1, useAppStore.getState().settings.concurrency)
  const active = state.jobs.filter((job) => ACTIVE.includes(job.phase)).length
  let slots = limit - active
  if (slots <= 0) return

  const queued = state.jobs
    .filter((job) => job.phase === 'queued')
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, slots)

  for (const job of queued) {
    slots -= 1
    set((current) => ({
      jobs: current.jobs.map((item) =>
        item.id === job.id ? { ...item, phase: 'fetching' as JobPhase, error: null } : item,
      ),
    }))
    void engine.startDownload(job.id, job.args).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar la descarga'
      set((current) => ({
        jobs: current.jobs.map((item) =>
          item.id === job.id ? { ...item, phase: 'error' as JobPhase, error: message } : item,
        ),
      }))
      useAppStore.getState().toast({ tone: 'error', title: 'No se pudo iniciar', description: message })
    })
  }
}

export const useDownloadsStore = create<DownloadsState>()(
  persist(
    (set, get) => ({
      jobs: [],
      history: [],
      hydrated: false,

      enqueue: (input) => {
        const id = crypto.randomUUID()
        const job: DownloadJob = {
          id,
          url: input.url,
          title: input.title,
          author: input.author,
          platform: input.platform,
          thumbnail: input.thumbnail,
          mode: input.mode,
          qualityLabel: input.qualityLabel,
          detail: input.detail,
          outputDir: input.outputDir,
          phase: 'queued',
          progress: 0,
          downloadedBytes: 0,
          totalBytes: input.totalBytes ?? null,
          speedBps: null,
          etaSec: null,
          filePath: null,
          error: null,
          createdAt: Date.now(),
          finishedAt: null,
          playlistTotal: input.playlistTotal ?? null,
          args: input.args,
        }
        set((state) => ({ jobs: [job, ...state.jobs] }))
        schedule(set as Setter, get)
        return id
      },

      applyEvent: (event) => {
        let finished = false

        set((state) => {
          const touched: DownloadJob[] = []

          const jobs = state.jobs.map((job) => {
            if (job.id !== event.id) return job
            const next: DownloadJob = { ...job }

            if (typeof event.downloadedBytes === 'number') next.downloadedBytes = event.downloadedBytes
            if (event.totalBytes !== undefined) next.totalBytes = event.totalBytes
            if (event.speedBps !== undefined) next.speedBps = event.speedBps
            if (event.etaSec !== undefined) next.etaSec = event.etaSec
            if (typeof event.percent === 'number') next.progress = event.percent
            if (event.filePath) next.filePath = event.filePath

            if (event.phase) {
              const changed = next.phase !== event.phase
              next.phase = event.phase
              if (changed && event.phase === 'done') {
                next.progress = 1
                next.finishedAt = Date.now()
                next.speedBps = null
                next.etaSec = null
                next.error = null
                finished = true
              }
              if (changed && event.phase === 'error') {
                next.error = event.message ?? job.error ?? 'La descarga falló'
                next.finishedAt = Date.now()
                next.speedBps = null
                next.etaSec = null
                finished = true
              }
              if (changed && (event.phase === 'paused' || event.phase === 'canceled')) {
                next.speedBps = null
                next.etaSec = null
                finished = true
              }
            }

            touched.push(next)
            return next
          })

          let history = state.history
          const completed = touched[0]
          if (completed?.phase === 'done' && !history.some((item) => item.id === completed.id)) {
            history = [toHistory(completed), ...history].slice(0, 300)
          }

          return { jobs, history }
        })

        if (finished) {
          const job = get().jobs.find((item) => item.id === event.id)
          if (job?.phase === 'done') {
            useAppStore.getState().toast({
              tone: 'success',
              title: 'Descarga completada',
              description: job.title,
            })
          }
          if (job?.phase === 'error') {
            useAppStore.getState().toast({
              tone: 'error',
              title: 'La descarga falló',
              description: job.error ?? job.title,
            })
          }
          schedule(set as Setter, get)
        }
      },

      pause: async (id) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id ? { ...job, phase: 'paused' as JobPhase, speedBps: null, etaSec: null } : job,
          ),
        }))
        try {
          await engine.pauseDownload(id)
        } catch {
          // the process may have already finished
        }
      },

      resume: async (id) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id ? { ...job, phase: 'queued' as JobPhase, error: null } : job,
          ),
        }))
        schedule(set as Setter, get)
      },

      cancel: async (id) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id
              ? { ...job, phase: 'canceled' as JobPhase, speedBps: null, etaSec: null, finishedAt: Date.now() }
              : job,
          ),
        }))
        try {
          await engine.cancelDownload(id)
        } catch {
          // ignore
        }
      },

      retry: (id) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id
              ? {
                  ...job,
                  phase: 'queued' as JobPhase,
                  progress: 0,
                  downloadedBytes: 0,
                  error: null,
                  finishedAt: null,
                }
              : job,
          ),
        }))
        schedule(set as Setter, get)
      },

      remove: (id) => {
        const job = get().jobs.find((item) => item.id === id)
        if (job && ACTIVE.includes(job.phase)) void engine.cancelDownload(id).catch(() => undefined)
        set((state) => ({ jobs: state.jobs.filter((item) => item.id !== id) }))
        schedule(set as Setter, get)
      },

      clearFinished: () => {
        set((state) => ({
          jobs: state.jobs.filter((job) => !['done', 'canceled'].includes(job.phase)),
        }))
      },

      clearHistory: () => set({ history: [] }),

      openJob: async (id) => {
        const job = get().jobs.find((item) => item.id === id)
        if (!job) return
        try {
          if (job.filePath) await engine.revealPath(job.filePath)
          else await engine.openPath(job.outputDir)
        } catch {
          useAppStore.getState().toast({ tone: 'error', title: 'No se pudo abrir la carpeta' })
        }
      },
    }),
    {
      name: 'media-downloader.downloads.v1',
      partialize: (state) => ({ jobs: state.jobs, history: state.history }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.hydrated = true
        const active = new Set<JobPhase>(['fetching', 'downloading', 'processing', 'queued'])
        state.jobs = state.jobs.map((job) =>
          active.has(job.phase)
            ? { ...job, phase: 'paused' as JobPhase, speedBps: null, etaSec: null }
            : job,
        )
      },
    },
  ),
)

export const selectActiveCount = (state: DownloadsState) =>
  state.jobs.filter((job) => ACTIVE.includes(job.phase)).length

export const selectQueueProgress = (state: DownloadsState) => {
  const active = state.jobs.filter((job) => ACTIVE.includes(job.phase))
  if (!active.length) return 0
  return active.reduce((total, job) => total + job.progress, 0) / active.length
}
