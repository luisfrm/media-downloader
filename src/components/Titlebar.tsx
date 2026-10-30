import { useEffect, useState } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'
import { Logo } from './Logo'
import { isTauri, platformName } from '../lib/engine'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../lib/cn'

async function windowAction(action: 'minimize' | 'maximize' | 'close') {
  if (!isTauri) return
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const win = getCurrentWindow()
  if (action === 'minimize') await win.minimize()
  if (action === 'maximize') await win.toggleMaximize()
  if (action === 'close') await win.close()
}

function WindowButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'grid h-11 w-[46px] place-items-center text-ink-3 transition-colors duration-100',
        danger ? 'hover:bg-[#c42b1c] hover:text-white' : 'hover:bg-white/[0.06] hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

export function Titlebar() {
  const railCollapsed = useAppStore((state) => state.railCollapsed)
  const capabilities = useAppStore((state) => state.capabilities)
  const [maximized, setMaximized] = useState(false)
  const [mac, setMac] = useState(false)

  useEffect(() => {
    setMac(platformName() === 'macos')
    if (!isTauri) return
    let disposed = false
    void import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
      const win = getCurrentWindow()
      const sync = async () => {
        const value = await win.isMaximized().catch(() => false)
        if (!disposed) setMaximized(value)
      }
      void sync()
      const unlisten = await win.onResized(() => void sync())
      return () => unlisten()
    })
    return () => {
      disposed = true
    }
  }, [])

  if (mac) return null

  const ready = Boolean(capabilities?.ytdlp)

  return (
    <header
      data-tauri-drag-region
      onDoubleClick={() => void windowAction('maximize')}
      className="drag-region relative z-40 flex h-11 shrink-0 items-stretch border-b border-line bg-panel"
    >
      <div
        data-tauri-drag-region
        className={cn(
          'flex shrink-0 items-center gap-2 overflow-hidden border-r border-line transition-[width] duration-200 ease-out',
          railCollapsed ? 'justify-center px-0' : 'px-3',
        )}
        style={{ width: 'var(--rail-w)' }}
      >
        <Logo size={20} />
        {!railCollapsed ? (
          <span className="min-w-0 truncate text-[12.5px] font-semibold tracking-[-0.01em] text-ink">
            Media Downloader
          </span>
        ) : null}
      </div>

      <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center px-4" />

      <div className="no-drag flex items-center gap-1 pr-1">
        <button
          type="button"
          onClick={() => useAppStore.getState().setRoute('settings')}
          title={ready ? `Motor yt-dlp ${capabilities?.ytdlp} listo` : 'Motor no disponible'}
          className="mr-1 hidden h-6 items-center gap-1.5 rounded-full border border-line bg-surface/70 px-2 text-[10px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink md:flex"
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              ready ? 'bg-green pulse-dot' : capabilities ? 'bg-amber' : 'bg-ink-3',
            )}
          />
          <span className="font-mono">{ready ? `yt-dlp ${capabilities?.ytdlp}` : 'motor'}</span>
        </button>

        <WindowButton label="Minimizar" onClick={() => void windowAction('minimize')}>
          <Minus className="size-3.5" strokeWidth={1.8} />
        </WindowButton>
        <WindowButton
          label={maximized ? 'Restaurar' : 'Maximizar'}
          onClick={() => void windowAction('maximize')}
        >
          {maximized ? <Copy className="size-3" strokeWidth={1.8} /> : <Square className="size-3" strokeWidth={1.8} />}
        </WindowButton>
        <WindowButton label="Cerrar" danger onClick={() => void windowAction('close')}>
          <X className="size-3.5" strokeWidth={1.8} />
        </WindowButton>
      </div>
    </header>
  )
}
