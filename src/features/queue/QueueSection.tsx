import { ArrowRight, FolderOpen, Inbox, PauseCircle } from 'lucide-react'
import { QueueRow } from './QueueRow'
import { useDownloadsStore, selectActiveCount } from '../../store/useDownloadsStore'
import { useAppStore } from '../../store/useAppStore'
import { formatSpeed } from '../../lib/format'

const ACTIVE = new Set(['fetching', 'downloading', 'processing'])

export function QueueSection({ limit = 3 }: { limit?: number }) {
  const jobs = useDownloadsStore((state) => state.jobs)
  const historyCount = useDownloadsStore((state) => state.history.length)
  const activeCount = useDownloadsStore(selectActiveCount)
  const pause = useDownloadsStore((state) => state.pause)
  const setRoute = useAppStore((state) => state.setRoute)

  const active = jobs.filter((job) => ACTIVE.has(job.phase))
  const queued = jobs.filter((job) => job.phase === 'queued')
  const paused = jobs.filter((job) => job.phase === 'paused')
  const failed = jobs.filter((job) => job.phase === 'error')
  const speed = active.reduce((total, job) => total + (job.speedBps ?? 0), 0)
  const firstRun = jobs.length === 0 && historyCount === 0

  const ordered = jobs
    .filter((job) => job.phase !== 'done' && job.phase !== 'canceled')
    .sort((a, b) => {
      const weight = (job: typeof a) =>
        ACTIVE.has(job.phase) ? 0 : job.phase === 'queued' ? 1 : job.phase === 'paused' ? 2 : job.phase === 'error' ? 3 : 4
      return weight(a) - weight(b) || b.createdAt - a.createdAt
    })

  const visible = ordered.slice(0, limit)
  const hidden = ordered.length - visible.length

  const status =
    activeCount > 0
      ? `${activeCount} activa${activeCount === 1 ? '' : 's'}${queued.length ? ` · ${queued.length} en cola` : ''}`
      : paused.length
        ? `${paused.length} en pausa`
        : failed.length
          ? `${failed.length} con error`
          : 'sin descargas'

  return (
    <section aria-labelledby="queue-heading">
      <div className="mb-2 flex h-6 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id="queue-heading" className="text-[13px] font-semibold text-ink">
            En curso
          </h2>
          <span className="font-mono text-[10px] text-ink-3" role="status" aria-live="polite">
            {status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {speed > 0 ? (
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-2">
              <span className="size-1.5 rounded-full bg-cyan pulse-dot" />
              {formatSpeed(speed)}
            </span>
          ) : null}

          {activeCount > 0 ? (
            <button
              type="button"
              onClick={() => active.forEach((job) => void pause(job.id))}
              className="hidden items-center gap-1 text-[10.5px] text-ink-3 transition-colors hover:text-ink-2 sm:flex"
            >
              <PauseCircle className="size-3" strokeWidth={1.8} />
              Pausar todo
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setRoute('queue')}
            className="flex items-center gap-1 text-[10.5px] text-ink-3 transition-colors hover:text-cyan"
          >
            Ver cola
            <ArrowRight className="size-3" strokeWidth={2} />
          </button>
        </div>
      </div>

      {visible.length ? (
        <div className="flex flex-col gap-1.5">
          {visible.map((job) => (
            <QueueRow key={job.id} job={job} />
          ))}
          {hidden > 0 ? (
            <button
              type="button"
              onClick={() => setRoute('queue')}
              className="flex h-7 items-center justify-center rounded-md border border-dashed border-line text-[10.5px] text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2"
            >
              {hidden} más en la cola
            </button>
          ) : null}
        </div>
      ) : firstRun ? (
        <EmptyFirstRun />
      ) : null}
    </section>
  )
}

function EmptyFirstRun() {
  const settings = useAppStore((state) => state.settings)
  const folder = settings.downloadDir.split(/[\\/]/).filter(Boolean).pop() ?? 'Descargas'

  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-surface/25 px-5 pb-6 pt-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{
          backgroundImage:
            'radial-gradient(420px 120px at 50% 0%, rgba(34,211,238,0.07), transparent 75%)',
        }}
      />
      <div className="relative flex flex-col items-center text-center">
        <div className="grid size-10 place-items-center rounded-lg border border-line bg-bg/60 text-ink-3">
          <Inbox className="size-[18px]" strokeWidth={1.6} />
        </div>
        <p className="mt-3 text-[13px] text-ink-2">Todavía no hay descargas</p>
        <p className="mt-1 max-w-[380px] text-[11px] leading-[18px] text-ink-3">
          Pegá un enlace arriba o arrastralo desde el navegador. Vas a poder elegir resolución, contenedor y audio
          antes de descargar.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10.5px] text-ink-3">
          <span className="flex items-center gap-1.5">
            <span className="kbd">Ctrl V</span> pegar
          </span>
          <span className="text-ink-3/40">·</span>
          <span className="flex items-center gap-1.5">
            <span className="kbd">Enter</span> analizar
          </span>
          <span className="text-ink-3/40">·</span>
          <span className="flex items-center gap-1.5">
            <FolderOpen className="size-3" strokeWidth={1.8} />
            {folder}
          </span>
        </div>
      </div>
    </div>
  )
}
