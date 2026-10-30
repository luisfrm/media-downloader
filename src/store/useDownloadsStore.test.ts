import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as engine from '../lib/engine'
import { useDownloadsStore, type EnqueueInput } from './useDownloadsStore'
import { useAppStore } from './useAppStore'

vi.mock('../lib/engine', () => ({
  isTauri: false,
  startDownload: vi.fn(async () => undefined),
  pauseDownload: vi.fn(async () => undefined),
  cancelDownload: vi.fn(async () => undefined),
  revealPath: vi.fn(async () => undefined),
  openPath: vi.fn(async () => undefined),
  saveSettings: vi.fn(async () => undefined),
  loadSettings: vi.fn(async () => null),
  capabilities: vi.fn(async () => null),
  subscribe: vi.fn(async () => () => undefined),
}))

const input = (overrides: Partial<EnqueueInput> = {}): EnqueueInput => ({
  url: 'https://x.com/a/status/1',
  title: 'Clip',
  author: 'Don Shelby',
  platform: 'x',
  thumbnail: '',
  mode: 'video',
  qualityLabel: '1080p · MP4',
  detail: 'H.264',
  outputDir: 'C:\\out',
  totalBytes: 1000,
  args: ['-f', 'http-10368', 'https://x.com/a/status/1'],
  ...overrides,
})

beforeEach(() => {
  useDownloadsStore.setState({ jobs: [], history: [] })
  useAppStore.setState({
    settings: { ...useAppStore.getState().settings, concurrency: 3 },
    toasts: [],
    toast: () => undefined,
  })
  vi.mocked(engine.startDownload).mockClear()
  vi.mocked(engine.pauseDownload).mockClear()
  vi.mocked(engine.cancelDownload).mockClear()
})

describe('enqueue', () => {
  it('adds a job and starts it immediately when a slot is free', () => {
    const id = useDownloadsStore.getState().enqueue(input())
    const job = useDownloadsStore.getState().jobs.find((item) => item.id === id)!
    expect(job.phase).toBe('fetching')
    expect(job.title).toBe('Clip')
    expect(engine.startDownload).toHaveBeenCalledTimes(1)
    expect(vi.mocked(engine.startDownload).mock.calls[0]?.[0]).toBe(id)
  })

  it('queues beyond the concurrency limit and starts the next when one finishes', () => {
    useAppStore.setState({ settings: { ...useAppStore.getState().settings, concurrency: 1 } })
    const first = useDownloadsStore.getState().enqueue(input({ title: 'Primero' }))
    const second = useDownloadsStore.getState().enqueue(input({ title: 'Segundo' }))

    expect(engine.startDownload).toHaveBeenCalledTimes(1)
    expect(useDownloadsStore.getState().jobs.find((job) => job.id === second)?.phase).toBe('queued')

    useDownloadsStore.getState().applyEvent({ type: 'progress', id: first, phase: 'done' })

    expect(useDownloadsStore.getState().jobs.find((job) => job.id === second)?.phase).toBe('fetching')
    expect(engine.startDownload).toHaveBeenCalledTimes(2)
  })
})

describe('applyEvent', () => {
  it('updates progress metrics', () => {
    const id = useDownloadsStore.getState().enqueue(input())
    useDownloadsStore.getState().applyEvent({
      type: 'progress',
      id,
      phase: 'downloading',
      percent: 0.42,
      downloadedBytes: 420,
      totalBytes: 1000,
      speedBps: 2048,
      etaSec: 9,
    })
    const job = useDownloadsStore.getState().jobs[0]!
    expect(job.phase).toBe('downloading')
    expect(job.progress).toBe(0.42)
    expect(job.speedBps).toBe(2048)
    expect(job.etaSec).toBe(9)
  })

  it('moves completed downloads to history exactly once', () => {
    const toast = vi.fn()
    useAppStore.setState({ toast })
    const id = useDownloadsStore.getState().enqueue(input())

    useDownloadsStore.getState().applyEvent({ type: 'progress', id, phase: 'done', filePath: 'C:\\out\\file.mp4' })
    useDownloadsStore.getState().applyEvent({ type: 'progress', id, phase: 'done', filePath: 'C:\\out\\file.mp4' })

    const state = useDownloadsStore.getState()
    expect(state.jobs[0]?.phase).toBe('done')
    expect(state.history).toHaveLength(1)
    expect(state.history[0]?.filePath).toBe('C:\\out\\file.mp4')
    expect(toast).toHaveBeenCalledTimes(1)
  })

  it('stores errors and clears the transfer speed', () => {
    const id = useDownloadsStore.getState().enqueue(input())
    useDownloadsStore.getState().applyEvent({
      type: 'progress',
      id,
      phase: 'error',
      message: 'El contenido es privado',
    })
    const job = useDownloadsStore.getState().jobs[0]!
    expect(job.phase).toBe('error')
    expect(job.error).toBe('El contenido es privado')
    expect(job.speedBps).toBeNull()
  })
})

describe('controls', () => {
  it('pauses optimistically and calls the engine', async () => {
    const id = useDownloadsStore.getState().enqueue(input())
    await useDownloadsStore.getState().pause(id)
    expect(useDownloadsStore.getState().jobs[0]?.phase).toBe('paused')
    expect(engine.pauseDownload).toHaveBeenCalledWith(id)
  })

  it('resumes a paused job', async () => {
    const id = useDownloadsStore.getState().enqueue(input())
    await useDownloadsStore.getState().pause(id)
    vi.mocked(engine.startDownload).mockClear()
    await useDownloadsStore.getState().resume(id)
    expect(useDownloadsStore.getState().jobs[0]?.phase).toBe('fetching')
    expect(engine.startDownload).toHaveBeenCalledTimes(1)
  })

  it('cancels and clears finished jobs', async () => {
    const id = useDownloadsStore.getState().enqueue(input())
    await useDownloadsStore.getState().cancel(id)
    expect(useDownloadsStore.getState().jobs[0]?.phase).toBe('canceled')
    useDownloadsStore.getState().clearFinished()
    expect(useDownloadsStore.getState().jobs).toHaveLength(0)
  })
})
