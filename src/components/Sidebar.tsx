import {
  Download,
  ListVideo,
  Library,
  RefreshCw,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  FolderOpen,
  CircleAlert,
} from 'lucide-react'
import { BrandIcon } from './BrandIcon'
import { useAppStore, type Route } from '../store/useAppStore'
import { useDownloadsStore, selectActiveCount } from '../store/useDownloadsStore'
import { cn } from '../lib/cn'
import { openPath } from '../lib/engine'
import { truncateMiddle } from '../lib/format'

interface NavItem {
  route: Route
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  shortcut: string
}

const primary: NavItem[] = [
  { route: 'home', label: 'Descargar', icon: Download, shortcut: '1' },
  { route: 'queue', label: 'Cola', icon: ListVideo, shortcut: '2' },
  { route: 'library', label: 'Biblioteca', icon: Library, shortcut: '3' },
]

const secondary: NavItem[] = [
  { route: 'converter', label: 'Conversor', icon: RefreshCw, shortcut: '4' },
  { route: 'settings', label: 'Ajustes', icon: Settings2, shortcut: '5' },
]

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  if (collapsed) return <div className="mx-2 my-2 h-px bg-line" />
  return (
    <div className="px-2 pb-1 pt-4 text-[9.5px] font-medium uppercase tracking-[0.16em] text-ink-3 first:pt-1">
      {children}
    </div>
  )
}

function RailButton({
  item,
  collapsed,
  active,
  badge,
  onClick,
}: {
  item: NavItem
  collapsed: boolean
  active: boolean
  badge?: number
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        'rail-item relative flex h-8 w-full items-center rounded-md text-[12.5px] transition-colors duration-150',
        collapsed ? 'justify-center px-0' : 'gap-2.5 px-2',
        active ? 'bg-white/[0.05] text-ink' : 'text-ink-2 hover:bg-white/[0.035] hover:text-ink',
      )}
    >
      {active ? <span className="absolute left-0 top-1.5 h-5 w-[2px] rounded-r-full bg-cyan" /> : null}
      <Icon
        className={cn('size-4 shrink-0 transition-colors', active ? 'text-cyan' : 'text-ink-3')}
        strokeWidth={1.8}
      />
      {!collapsed ? (
        <>
          <span className="truncate">{item.label}</span>
          {typeof badge === 'number' && badge > 0 ? (
            <span className="ml-auto inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-cyan/12 px-1 font-mono text-[10px] text-cyan">
              {badge}
            </span>
          ) : null}
        </>
      ) : (
        <>
          {typeof badge === 'number' && badge > 0 ? (
            <span className="absolute right-1 top-1 grid size-[13px] place-items-center rounded-full bg-cyan text-[8px] font-semibold text-[#062430]">
              {badge > 9 ? '9+' : badge}
            </span>
          ) : null}
          <span className="tooltip">
            {item.label}
            <span className="ml-2 font-mono text-[10px] text-ink-3">Ctrl {item.shortcut}</span>
          </span>
        </>
      )}
    </button>
  )
}

export function Sidebar() {
  const route = useAppStore((state) => state.route)
  const collapsed = useAppStore((state) => state.railCollapsed)
  const toggleRail = useAppStore((state) => state.toggleRail)
  const setRoute = useAppStore((state) => state.setRoute)
  const settings = useAppStore((state) => state.settings)
  const capabilities = useAppStore((state) => state.capabilities)
  const activeCount = useDownloadsStore(selectActiveCount)

  const folderName = settings.downloadDir.split(/[\\/]/).filter(Boolean).pop() ?? 'Descargas'
  const parentPath = settings.downloadDir.replace(/[\\/][^\\/]+$/, '') || settings.downloadDir
  const ready = Boolean(capabilities?.ytdlp)
  const ffmpegReady = Boolean(capabilities?.ffmpeg)

  return (
    <aside
      className="flex shrink-0 flex-col border-r border-line bg-panel transition-[width] duration-200 ease-out"
      style={{ width: 'var(--rail-w)' }}
    >
      <nav className={cn('flex flex-col px-2', collapsed && 'px-1.5')}>
        <SectionLabel collapsed={collapsed}>Flujo</SectionLabel>
        {primary.map((item) => (
          <RailButton
            key={item.route}
            item={item}
            collapsed={collapsed}
            active={route === item.route}
            badge={item.route === 'queue' ? activeCount : undefined}
            onClick={() => setRoute(item.route)}
          />
        ))}

        <SectionLabel collapsed={collapsed}>Herramientas</SectionLabel>
        {secondary.map((item) => (
          <RailButton
            key={item.route}
            item={item}
            collapsed={collapsed}
            active={route === item.route}
            onClick={() => setRoute(item.route)}
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1.5 p-2">
        {collapsed ? (
          <button
            type="button"
            onClick={() => void openPath(settings.downloadDir)}
            title={settings.downloadDir}
            className="rail-item relative grid size-8 self-center place-items-center rounded-md text-ink-3 transition-colors hover:bg-white/[0.05] hover:text-ink"
          >
            <FolderOpen className="size-4" strokeWidth={1.8} />
            <span className="tooltip">{truncateMiddle(settings.downloadDir, 48)}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void openPath(settings.downloadDir)}
            title={settings.downloadDir}
            className="group flex items-center gap-2 rounded-md border border-line bg-surface/50 px-2 py-1.5 text-left transition-colors hover:border-line-strong"
          >
            <FolderOpen className="size-3.5 shrink-0 text-ink-3" strokeWidth={1.8} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] text-ink-2">{folderName}</span>
              <span className="block truncate font-mono text-[9.5px] text-ink-3">{parentPath}</span>
            </span>
          </button>
        )}

        {collapsed ? (
          <button
            type="button"
            onClick={() => setRoute('settings')}
            className="rail-item relative grid size-8 self-center place-items-center rounded-md transition-colors hover:bg-white/[0.05]"
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                ready ? 'bg-green pulse-dot' : capabilities ? 'bg-amber' : 'bg-ink-3',
              )}
            />
            <span className="tooltip">
              {ready ? `yt-dlp ${capabilities?.ytdlp}` : 'Motor no detectado'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setRoute('settings')}
            className="rounded-md border border-line bg-surface/50 px-2 py-1.5 text-left transition-colors hover:border-line-strong"
          >
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  ready ? 'bg-green pulse-dot' : capabilities ? 'bg-amber' : 'bg-ink-3',
                )}
              />
              <span className="text-[11px] text-ink-2">{ready ? 'Motor listo' : 'Motor no detectado'}</span>
              <span className="ml-auto truncate font-mono text-[9.5px] text-ink-3">
                {capabilities?.ytdlp ?? '—'}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1 pl-3 text-[9.5px] text-ink-3">
              {ffmpegReady ? (
                <span>ffmpeg {capabilities?.ffmpeg}</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber/80">
                  <CircleAlert className="size-2.5" /> ffmpeg pendiente
                </span>
              )}
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={toggleRail}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
          className={cn(
            'rail-item relative mt-0.5 flex h-7 items-center rounded-md text-[11px] text-ink-3 transition-colors hover:bg-white/[0.04] hover:text-ink-2',
            collapsed ? 'justify-center' : 'gap-2 px-2',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" strokeWidth={1.8} />
          ) : (
            <>
              <PanelLeftClose className="size-3.5" strokeWidth={1.8} />
              <span>Contraer</span>
              <span className="kbd ml-auto">Ctrl B</span>
            </>
          )}
          {collapsed ? <span className="tooltip">Expandir · Ctrl B</span> : null}
        </button>
      </div>
    </aside>
  )
}

export function PlatformRailIcon({ platform }: { platform: 'youtube' | 'x' }) {
  return <BrandIcon platform={platform} size={14} />
}
