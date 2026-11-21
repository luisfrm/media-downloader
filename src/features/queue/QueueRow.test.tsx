import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { DownloadJob } from '../../lib/types'
import { QueueRow } from './QueueRow'

function job(overrides: Partial<DownloadJob> = {}): DownloadJob {
  return {
    id: 'job-1',
    url: 'https://www.youtube.com/playlist?list=PL1',
    title: 'Playlist de prueba',
    author: 'Canal',
    platform: 'youtube',
    thumbnail: '',
    mode: 'video',
    qualityLabel: '1080p',
    detail: 'H.264',
    outputDir: 'C:\\out',
    phase: 'queued',
    progress: 0,
    downloadedBytes: 0,
    totalBytes: null,
    speedBps: null,
    etaSec: null,
    filePath: null,
    error: null,
    createdAt: 0,
    finishedAt: null,
    playlistTotal: 3,
    args: [],
    ...overrides,
  }
}

describe('QueueRow', () => {
  it('labels playlist items according to the download mode', () => {
    const { rerender } = render(<QueueRow job={job({ mode: 'video' })} />)
    expect(screen.getByText('3 videos')).toBeInTheDocument()

    rerender(<QueueRow job={job({ mode: 'audio' })} />)
    expect(screen.getByText('3 audios')).toBeInTheDocument()

    rerender(<QueueRow job={job({ mode: 'audio', playlistTotal: 1 })} />)
    expect(screen.getByText('1 audio')).toBeInTheDocument()
  })
})
