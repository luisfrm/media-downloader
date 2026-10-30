import { useState } from 'react'
import { FolderOpen, Search, Trash2 } from 'lucide-react'
import { BrandIcon } from '../../components/BrandIcon'
import { Chip } from '../../components/ui/Chip'
import { IconButton } from '../../components/ui/IconButton'
import { PageHeader } from '../../components/PageHeader'
import { useDownloadsStore } from '../../store/useDownloadsStore'
import { useAppStore } from '../../store/useAppStore'
import { formatBytes, timeAgo, truncateMiddle } from '../../lib/format'
import { openPath, revealPath } from '../../lib/engine'
import { PLATFORMS, PLATFORM_ORDER } from '../../lib/platform'
import { cn } from '../../lib/cn'
import type { Platform } from '../../lib/types'

export function LibraryPage() {
  const history = useDownloadsStore((state) => state.history)
  const clearHistory = useDownloadsStore((state) => state.clearHistory)
  const toast = useAppStore((state) => state.toast)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Platform | 'all'>('all')

  const items = history.filter((item) => {
    if (filter !== 'all' && item.platform !== filter) return false
    if (!query.trim()) return true
    const needle = query.trim().toLowerCase()
    return item.title.toLowerCase().includes(needle) || item.author.toLowerCase().includes(needle)
  })

  return (
    <div className="mx-auto w-full max-w-[1060px] px-6 py-5">
      <PageHeader
        title="Biblioteca"
        subtitle="Todo lo que descargaste, con su calidad y ubicación."
        actions={
          history.length ? (
            <button
              type="button"
              onClick={() => {
                clearHistory()
                toast({ tone: 'info', title: 'Biblioteca vaciada' })
              }}
              className="inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2 text-[11px] text-ink-3 transition-colors hover:bg-white/[0.05] hover:text-rose"
            >
              <Trash2 className="size-3" strokeWidth={1.8} />
              Vaciar
            </button>
          ) : null
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <div className="flex h-8 min-w-[200px] flex-1 items-center gap-2 rounded-md border border-line bg-surface/40 px-2.5 focus-within:border-cyan/35">
          <Search className="size-3.5 text-ink-3" strokeWidth={1.8} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título o autor…"
            aria-label="Buscar en la biblioteca"
            className="h-full min-w-0 flex-1 bg-transparent text-[11.5px] text-ink placeholder:text-ink-3"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} className="text-[10px] text-ink-3 hover:text-ink">
              Limpiar
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
            Todas
          </FilterPill>
          {PLATFORM_ORDER.map((platform) => (
            <FilterPill key={platform} active={filter === platform} onClick={() => setFilter(platform)}>
              <BrandIcon platform={platform} size={10} />
              <span className="hidden sm:inline">{PLATFORMS[platform].name}</span>
            </FilterPill>
          ))}
        </div>
      </div>

      {items.length ? (
        <div className="overflow-hidden rounded-lg border border-line bg-surface/25">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex h-14 items-center gap-3 border-b border-line/70 px-3 last:border-b-0 hover:bg-white/[0.025]"
            >
              <div className="h-7 w-11 shrink-0 overflow-hidden rounded-[3px] border border-line bg-bg">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <BrandIcon platform={item.platform} size={10} className="shrink-0 text-ink-3" />
                  <span className="truncate text-[12px] text-ink">{item.title}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[9.5px] text-ink-3">
                  {item.author ? <span className="truncate">{item.author}</span> : <span>—</span>}
                  <span className="text-ink-3/50">·</span>
                  <span className="truncate" title={item.outputDir}>
                    {truncateMiddle(item.outputDir, 40)}
                  </span>
                </div>
              </div>

              <Chip tone="neutral" className="hidden md:inline-flex">
                {item.qualityLabel}
              </Chip>
              <span className="hidden w-16 shrink-0 text-right font-mono text-[10px] text-ink-3 sm:inline">
                {formatBytes(item.sizeBytes)}
              </span>
              <span className="w-16 shrink-0 whitespace-nowrap text-right font-mono text-[9.5px] text-ink-3">
                {timeAgo(item.finishedAt)}
              </span>

              <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <IconButton
                  label="Mostrar archivo"
                  size="sm"
                  onClick={() => void (item.filePath ? revealPath(item.filePath) : openPath(item.outputDir))}
                >
                  <FolderOpen className="size-3.5" strokeWidth={1.8} />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-surface/25 py-14 text-center">
          <div className="grid size-10 place-items-center rounded-lg border border-line bg-white/[0.025] text-ink-3">
            <FolderOpen className="size-5" strokeWidth={1.6} />
          </div>
          <p className="mt-3 text-[12.5px] text-ink-2">
            {history.length ? 'No hay resultados para ese filtro' : 'Todavía no descargaste nada'}
          </p>
          <p className="mt-1 max-w-[280px] text-[11px] text-ink-3">
            {history.length
              ? 'Probá con otra búsqueda o quitá el filtro de plataforma.'
              : 'Los archivos completados aparecen acá con su calidad y carpeta de destino.'}
          </p>
        </div>
      )}
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-[5px] border px-2 text-[10.5px] transition-colors',
        active
          ? 'border-cyan/35 bg-cyan/[0.07] text-ink'
          : 'border-line bg-surface/30 text-ink-3 hover:border-line-strong hover:text-ink-2',
      )}
    >
      {children}
    </button>
  )
}
