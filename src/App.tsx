import { useEffect } from 'react'
import { CircleAlert, Check, Info, X } from 'lucide-react'
import { Titlebar } from './components/Titlebar'
import { Sidebar } from './components/Sidebar'
import { HomePage } from './features/home/HomePage'
import { QueuePage } from './features/queue/QueuePage'
import { LibraryPage } from './features/library/LibraryPage'
import { ConverterPage } from './features/converter/ConverterPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { useAppStore, type Route } from './store/useAppStore'
import { useDownloadsStore } from './store/useDownloadsStore'
import * as engine from './lib/engine'
import { cn } from './lib/cn'

const routes: Array<[string, Route]> = [
  ['1', 'home'],
  ['2', 'queue'],
  ['3', 'library'],
  ['4', 'converter'],
  ['5', 'settings'],
]

function Toasts() {
  const toasts = useAppStore((state) => state.toasts)
  const dismiss = useAppStore((state) => state.dismissToast)

  if (!toasts.length) return null

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-[80] flex w-[320px] flex-col gap-1.5">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'animate-rise pointer-events-auto flex items-start gap-2 rounded-lg border bg-elevated/95 p-2.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)] backdrop-blur',
            toast.tone === 'success' && 'border-green/25',
            toast.tone === 'error' && 'border-rose/30',
            toast.tone === 'info' && 'border-line-strong',
          )}
        >
          <span
            className={cn(
              'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full',
              toast.tone === 'success' && 'bg-green/15 text-green',
              toast.tone === 'error' && 'bg-rose/15 text-rose',
              toast.tone === 'info' && 'bg-white/[0.06] text-ink-2',
            )}
          >
            {toast.tone === 'success' ? (
              <Check className="size-2.5" strokeWidth={3} />
            ) : toast.tone === 'error' ? (
              <CircleAlert className="size-3" strokeWidth={2} />
            ) : (
              <Info className="size-3" strokeWidth={2} />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-medium text-ink">{toast.title}</p>
            {toast.description ? (
              <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-4 text-ink-3">{toast.description}</p>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Cerrar notificación"
            onClick={() => dismiss(toast.id)}
            className="-m-1 grid size-6 place-items-center rounded text-ink-3 transition-colors hover:bg-white/[0.06] hover:text-ink"
          >
            <X className="size-3" strokeWidth={1.8} />
          </button>
        </div>
      ))}
    </div>
  )
}

function CurrentPage({ route }: { route: Route }) {
  switch (route) {
    case 'queue':
      return <QueuePage />
    case 'library':
      return <LibraryPage />
    case 'converter':
      return <ConverterPage />
    case 'settings':
      return <SettingsPage />
    default:
      return <HomePage />
  }
}

export default function App() {
  const route = useAppStore((state) => state.route)
  const railCollapsed = useAppStore((state) => state.railCollapsed)
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion)
  const hydrateSettings = useAppStore((state) => state.hydrateSettings)
  const refreshCapabilities = useAppStore((state) => state.refreshCapabilities)

  useEffect(() => {
    void hydrateSettings()
    void refreshCapabilities()
  }, [hydrateSettings, refreshCapabilities])

  useEffect(() => {
    let unsubscribe: (() => void) | null = null
    void engine.subscribe((event) => useDownloadsStore.getState().applyEvent(event)).then((fn) => {
      unsubscribe = fn
    })
    return () => unsubscribe?.()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return
      const key = event.key.toLowerCase()

      if (key === 'b') {
        event.preventDefault()
        useAppStore.getState().toggleRail()
        return
      }

      const match = routes.find(([shortcut]) => shortcut === event.key)
      if (match) {
        event.preventDefault()
        useAppStore.getState().setRoute(match[1])
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!engine.isTauri) return
    void import('@tauri-apps/api/window').then(async ({ getCurrentWindow, currentMonitor, LogicalSize }) => {
      const win = getCurrentWindow()
      const monitor = await currentMonitor().catch(() => null)
      if (!monitor) return
      const logicalWidth = monitor.workArea.size.width / monitor.scaleFactor
      const logicalHeight = monitor.workArea.size.height / monitor.scaleFactor
      const width = Math.min(1280, Math.max(960, Math.round(logicalWidth - 16)))
      const height = Math.min(820, Math.max(600, Math.round(logicalHeight - 16)))
      await win.setSize(new LogicalSize(width, height)).catch(() => undefined)
      await win.center().catch(() => undefined)
    })
  }, [])

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? 'true' : 'false'
  }, [reduceMotion])

  return (
    <div
      className="flex h-full flex-col overflow-hidden bg-bg"
      style={{ '--rail-w': railCollapsed ? '64px' : '240px' } as React.CSSProperties}
    >
      <Titlebar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="canvas-glow min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <CurrentPage route={route} />
        </main>
      </div>
      <Toasts />
    </div>
  )
}
