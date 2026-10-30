import { ArrowRight, FolderOpen } from 'lucide-react'
import { BrandIcon } from '../../components/BrandIcon'
import { IconButton } from '../../components/ui/IconButton'
import { useDownloadsStore } from '../../store/useDownloadsStore'
import { useAppStore } from '../../store/useAppStore'
import { formatBytes, timeAgo } from '../../lib/format'
import { openPath } from '../../lib/engine'

export function RecentSection() {
  const history = useDownloadsStore((state) => state.history)
  const setRoute = useAppStore((state) => state.setRoute)

  if (!history.length) return null
  const items = history.slice(0, 4)

  return (
    <section aria-labelledby="recent-heading" className="mt-6">
      <div className="mb-2 flex h-6 items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 id="recent-heading" className="text-[13px] font-semibold text-ink">
            Finalizadas
          </h2>
          <span className="font-mono text-[10px] text-ink-3">{history.length}</span>
        </div>
        <button
          type="button"
          onClick={() => setRoute('library')}
          className="flex items-center gap-1 text-[10.5px] text-ink-3 transition-colors hover:text-cyan"
        >
          Ver biblioteca
          <ArrowRight className="size-3" strokeWidth={2} />
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface/25">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex h-11 items-center gap-2.5 border-b border-line/70 px-2.5 last:border-b-0 hover:bg-white/[0.025]"
          >
            <div className="h-6 w-10 shrink-0 overflow-hidden rounded-[3px] border border-line bg-bg">
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
            <BrandIcon platform={item.platform} size={10} className="shrink-0 text-ink-3" />
            <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-2">{item.title}</span>
            <span className="hidden shrink-0 font-mono text-[9.5px] text-ink-3 md:inline">{item.qualityLabel}</span>
            <span className="hidden w-16 shrink-0 text-right font-mono text-[9.5px] text-ink-3 sm:inline">
              {formatBytes(item.sizeBytes)}
            </span>
            <span className="w-14 shrink-0 text-right font-mono text-[9.5px] text-ink-3">
              {timeAgo(item.finishedAt)}
            </span>
            <IconButton
              label="Abrir carpeta"
              size="sm"
              className="opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => void openPath(item.filePath ?? item.outputDir)}
            >
              <FolderOpen className="size-3.5" strokeWidth={1.8} />
            </IconButton>
          </div>
        ))}
      </div>
    </section>
  )
}
