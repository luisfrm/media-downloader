import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fixture from '../../test/fixtures/x-video.json'
import { normalizeMedia } from '../../lib/probe'
import type { RawInfo } from '../../lib/types'
import { ResultCard } from './ResultCard'
import * as engine from '../../lib/engine'
import { useAppStore } from '../../store/useAppStore'
import { useDownloadsStore } from '../../store/useDownloadsStore'

vi.mock('../../lib/engine', () => ({
  isTauri: false,
  startDownload: vi.fn(async () => undefined),
  pauseDownload: vi.fn(async () => undefined),
  cancelDownload: vi.fn(async () => undefined),
  revealPath: vi.fn(async () => undefined),
  openPath: vi.fn(async () => undefined),
  openExternal: vi.fn(async () => undefined),
  saveSettings: vi.fn(async () => undefined),
  loadSettings: vi.fn(async () => null),
  capabilities: vi.fn(async () => null),
  subscribe: vi.fn(async () => () => undefined),
}))

const media = normalizeMedia(fixture as unknown as RawInfo, {
  hasFfmpeg: true,
  preferredQuality: 'best',
  platformHint: 'x',
})

beforeEach(() => {
  useDownloadsStore.setState({ jobs: [], history: [] })
  useAppStore.setState({
    settings: {
      ...useAppStore.getState().settings,
      downloadDir: 'C:\\Users\\demo\\Downloads',
      preferredQuality: 'best',
    },
    capabilities: {
      ytdlp: '2026.10.26',
      ffmpeg: '7.1',
      binDir: 'C:\\bin',
      platform: 'win32',
      defaultDir: 'C:\\Users\\demo\\Downloads',
    },
    toast: () => undefined,
  })
  vi.mocked(engine.startDownload).mockClear()
})

function renderCard() {
  const onDiscard = vi.fn()
  render(<ResultCard media={media} onDiscard={onDiscard} />)
  return { onDiscard }
}

describe('ResultCard', () => {
  it('renders real metadata and quality options', () => {
    renderCard()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Zidanesca')
    expect(screen.getByRole('radio', { name: /1200 × 1500/i })).toBeChecked()
    expect(screen.getByText('Recomendado')).toBeInTheDocument()
  })

  it('enqueues the selected video quality and closes the card', async () => {
    const user = userEvent.setup()
    const { onDiscard } = renderCard()

    await user.click(screen.getByRole('radio', { name: /720 × 900/i }))
    await user.click(screen.getByRole('button', { name: 'Descargar' }))

    expect(engine.startDownload).toHaveBeenCalledTimes(1)
    const args = vi.mocked(engine.startDownload).mock.calls[0]![1]
    expect(args).toContain('http-2176')
    expect(args).not.toContain('--merge-output-format')
    expect(onDiscard).toHaveBeenCalled()

    const job = useDownloadsStore.getState().jobs[0]!
    expect(job.qualityLabel).toBe('720 × 900 · MP4')
    expect(job.totalBytes).toBe(5140799)
  })

  it('switches to audio extraction', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByRole('tab', { name: 'Audio' }))
    await user.click(screen.getByRole('radio', { name: /MP3 · 320/i }))
    await user.click(screen.getByRole('button', { name: 'Descargar' }))

    const args = vi.mocked(engine.startDownload).mock.calls[0]![1]
    expect(args).toContain('--audio-format')
    expect(args[args.indexOf('--audio-format') + 1]).toBe('mp3')
    expect(args[args.indexOf('--audio-quality') + 1]).toBe('320K')
  })

  it('offers the thumbnail tab', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByRole('tab', { name: 'Miniatura' }))
    await user.click(screen.getByRole('button', { name: 'Descargar' }))

    const args = vi.mocked(engine.startDownload).mock.calls[0]![1]
    expect(args).toContain('--write-thumbnail')
    expect(args).toContain('--skip-download')
  })

  it('syncs the container selection with the download args', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByLabelText('Contenedor de salida'))
    await user.click(screen.getByRole('option', { name: /MKV/i }))
    await user.click(screen.getByRole('button', { name: 'Descargar' }))

    const args = vi.mocked(engine.startDownload).mock.calls[0]![1]
    expect(args[args.indexOf('--remux-video') + 1]).toBe('mkv')
  })
})
