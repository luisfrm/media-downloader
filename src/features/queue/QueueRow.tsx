import {
  Check,
  FolderOpen,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { BrandIcon } from '../../components/BrandIcon'
import { Chip } from '../../components/ui/Chip'
import { IconButton } from '../../components/ui/IconButton'
import { Progress } from '../../components/ui/Progress'
import { cn } from '../../lib/cn'
import { formatBytes, formatEta, formatSpeed } from '../../lib/format'
import type { DownloadJob } from '../../lib/types'
import { useDownloadsStore } from '../../store/useDownloadsStore'

function phaseLabel(job: DownloadJob): string {
  switch (job.phase) {
    case 'queued':
      return 'En cola'
    case 'fetching':
      return 'Leyendo metadata'
    case 'downloading':
      return `${Math.round(job.progress * 100)}%`
    case 'processing':
      return job.mode === 'audio' ? 'Convirtiendo audio' : job.mode === 'subtitles' ? 'Generando subtítulos' : 'Fusionando streams'
    case 'done':
      return 'Completado'
    case 'paused':
      return 'Pausado'
    case 'canceled':
      return 'Cancelado'
    case 'error':
      return job.error ?? 'Error'
    default:
      return ''
  }
}

function toneFor(job: DownloadJob): 'cyan' | 'green' | 'amber' | 'blue' {
  if (job.phase === 'done') return 'green'
  if (job.phase === 'paused' || job.phase === 'error' || job.phase === 'canceled') return 'amber'
  if (job.phase === 'processing') return 'blue'
  return 'cyan'
}

const activePhases = new Set(['fetching', 'downloading', 'processing'])

export function QueueRow({ job }: { job: DownloadJob }) {
  const pause = useDownloadsStore((state) => state.pause)
  const resume = useDownloadsStore((state) => state.resume)
  const cancel = useDownloadsStore((state) => state.cancel)
  const retry = useDownloadsStore((state) => state.retry)
  const remove = useDownloadsStore((state) => state.remove)
  const openJob = useDownloadsStore((state) => state.openJob)

  const active = activePhases.has(job.phase)
  const paused = job.phase === 'paused'
  const failed = job.phase === 'error'
  const done = job.phase === 'done'

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border px-3 py-2 transition-colors duration-150',
        active ? 'border-line bg-surface/55' : 'border-line/70 bg-surface/30 hover:bg-surface/50',
        failed && 'border-rose/20',
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative h-9 w-[56px] shrink-0 overflow-hidden rounded-[4px] border border-line bg-bg">
          {job.thumbnail ? (
            <img
              src={job.thumbnail}
              alt=""
              className="size-full object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <div className="grid size-full place-items-center text-ink-3">
              <BrandIcon platform={job.platform} size={14} />
            </div>
          )}
          {done ? (
            <span className="absolute inset-0 grid place-items-center bg-bg/55 text-green">
              <Check className="size-3.5" strokeWidth={2.6} />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <BrandIcon
              platform={job.platform}
              size={10}
              className={cn('shrink-0', active ? 'text-ink-2' : 'text-ink-3')}
            />
            <span className="truncate text-[12px] text-ink">{job.title}</span>
            {job.playlistTotal ? (
              <Chip tone="neutral" className="hidden shrink-0 sm:inline-flex">
                {job.playlistTotal} videos
              </Chip>
            ) : null}
          </div>

          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 font-mono text-[9.5px] text-ink-3">
            <span className="shrink-0 text-ink-2/80">{job.qualityLabel}</span>
            <span className="text-ink-3/50">·</span>
            <span
              className={cn(
                'truncate',
                done && 'text-green/80',
                failed && 'text-rose/90',
                paused && 'text-amber/80',
                active && 'text-cyan/80',
              )}
              title={failed ? job.error ?? undefined : undefined}
            >
              {phaseLabel(job)}
            </span>
            {job.totalBytes ? (
              <>
                <span className="text-ink-3/50">·</span>
                <span className="shrink-0 tnum">
                  {done
                    ? formatBytes(job.totalBytes)
                    : `${formatBytes(job.downloadedBytes)} / ${formatBytes(job.totalBytes)}`}
                </span>
              </>
            ) : job.downloadedBytes > 0 ? (
              <>
                <span className="text-ink-3/50">·</span>
                <span className="shrink-0 tnum">{formatBytes(job.downloadedBytes)}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="hidden w-[92px] shrink-0 flex-col items-end sm:flex">
          <span className={cn('font-mono text-[10.5px] tnum', active ? 'text-ink-2' : 'text-ink-3')}>
            {active ? formatSpeed(job.speedBps) : done ? formatBytes(job.totalBytes) : '—'}
          </span>
          <span className="font-mono text-[9px] text-ink-3">
            {active && job.etaSec != null ? formatEta(job.etaSec) : ' '}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {active ? (
            <>
              <IconButton label="Pausar descarga" size="sm" onClick={() => void pause(job.id)}>
                <Pause className="size-3.5" strokeWidth={1.9} />
              </IconButton>
              <IconButton label="Cancelar descarga" size="sm" tone="danger" onClick={() => void cancel(job.id)}>
                <X className="size-3.5" strokeWidth={1.9} />
              </IconButton>
            </>
          ) : null}

          {paused || job.phase === 'canceled' ? (
            <>
              <IconButton label="Reanudar descarga" size="sm" tone="accent" onClick={() => void resume(job.id)}>
                <Play className="size-3.5" strokeWidth={1.9} />
              </IconButton>
              <IconButton label="Quitar de la cola" size="sm" tone="danger" onClick={() => remove(job.id)}>
                <Trash2 className="size-3.5" strokeWidth={1.8} />
              </IconButton>
            </>
          ) : null}

          {failed ? (
            <>
              <IconButton label="Reintentar descarga" size="sm" tone="accent" onClick={() => retry(job.id)}>
                <RotateCcw className="size-3.5" strokeWidth={1.9} />
              </IconButton>
              <IconButton label="Quitar de la cola" size="sm" tone="danger" onClick={() => remove(job.id)}>
                <Trash2 className="size-3.5" strokeWidth={1.8} />
              </IconButton>
            </>
          ) : null}

          {done ? (
            <>
              <IconButton label="Abrir carpeta" size="sm" onClick={() => void openJob(job.id)}>
                <FolderOpen className="size-3.5" strokeWidth={1.8} />
              </IconButton>
              <IconButton label="Quitar de la cola" size="sm" tone="danger" onClick={() => remove(job.id)}>
                <Trash2 className="size-3.5" strokeWidth={1.8} />
              </IconButton>
            </>
          ) : null}

          {job.phase === 'queued' ? (
            <IconButton label="Quitar de la cola" size="sm" tone="danger" onClick={() => remove(job.id)}>
              <Trash2 className="size-3.5" strokeWidth={1.8} />
            </IconButton>
          ) : null}
        </div>
      </div>

      {active || paused ? (
        <Progress
          value={job.progress}
          tone={toneFor(job)}
          indeterminate={job.phase === 'processing'}
          className="mt-1.5"
          height={job.phase === 'processing' ? 2 : 3}
        />
      ) : null}
    </div>
  )
}
