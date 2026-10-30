import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommandBar } from './CommandBar'
import type { Settings } from '../../lib/types'

function setup(overrides: Partial<React.ComponentProps<typeof CommandBar>> = {}) {
  const props: React.ComponentProps<typeof CommandBar> = {
    value: '',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    onPaste: vi.fn(),
    loading: false,
    platform: 'other',
    error: null,
    inputRef: { current: null },
    preset: 'best' as Settings['preferredQuality'],
    onPreset: vi.fn(),
    folder: 'C:\\Users\\demo\\Downloads\\Media Downloader',
    onPickFolder: vi.fn(),
    clipboardWatch: true,
    onClipboardWatch: vi.fn(),
    ...overrides,
  }
  render(<CommandBar {...props} />)
  return props
}

describe('CommandBar', () => {
  it('submits on Enter', async () => {
    const user = userEvent.setup()
    const props = setup({ value: 'https://x.com/a/status/1' })
    await user.type(screen.getByLabelText('Enlace de video'), '{Enter}')
    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('shows the detected platform badge', () => {
    setup({ value: 'https://x.com/a/status/1', platform: 'x' })
    expect(screen.getAllByText('X').length).toBeGreaterThan(0)
  })

  it('renders validation errors as an alert', () => {
    setup({ error: 'Eso no parece un enlace.' })
    expect(screen.getByRole('alert')).toHaveTextContent('Eso no parece un enlace.')
  })

  it('switches the preferred quality', async () => {
    const user = userEvent.setup()
    const props = setup()
    await user.click(screen.getByLabelText('Calidad preferida'))
    await user.click(screen.getByRole('option', { name: /1080p/i }))
    expect(props.onPreset).toHaveBeenCalledWith('1080')
  })

  it('disables the analyze action while loading', () => {
    setup({ loading: true })
    expect(screen.getByLabelText('Analizar enlace')).toBeDisabled()
  })
})
