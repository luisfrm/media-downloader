import { useState } from 'react'
import { ListVideo, Pause, Play, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/Button'
import { Segmented } from '../../components/ui/Segmented'
import { useDownloadsStore, selectActiveCount } from '../../store/useDownloadsStore'
import { QueueRow } from './QueueRow'
import { formatBytes, formatSpeed } from '../../lib/format'
import type { DownloadJob } from '../../lib/types'

type Filter = 'all' | 'active' | 'done' | 'error'

const ACTIVE = new Set(['fetching', 'downloading', 'processing'])

function byCreated(a: DownloadJob, b: DownloadJob) {
  return b.createdAt - a.createdAt
}

export function QueuePage() {
  const jobs = useDownloadsStore((state) => state.jobs)
  const activeCount = useDownloadsStore(selectActiveCount)
  const pause = useDownloadsStore((state) => state.pause)
  const resume = useDownloadsStore((state) => state.resume)
  const clearFinished = useDownloadsStore((state) => state.clearFinished)
  const [filter, setFilter] = useState<Filter>('all')

  const active = jobs.filter((job) => ACTIVE.has(job.phase))
  const queued = jobs.filter((job) => job.phase === 'queued')
  const paused = jobs.filter((job) => job.phase === 'paused')
  const failed = jobs.filter((job) => job.phase === 'error')
  const canceled = jobs.filter((job) => job.phase === 'canceled')
  const done = jobs.filter((job) => job.phase === 'done')
  const speed = active.reduce((total, job) => total + (job.speedBps ?? 0), 0)
  const remaining = active.reduce(
    (total, job) => total + Math.max(0, (job.totalBytes ?? 0) - job.downloadedBytes),
    0,
  )

  const groups = [
    {
      key: 'active',
      label: 'En curso',
      jobs: [...active, ...queued].sort(byCreated),
      tone: 'text-cyan/80',
    },
    { key: 'paused', label: 'En pausa', jobs: [...paused].sort(byCreated), tone: 'text-amber/80' },
    { key: 'error', label: 'Con error', jobs: [...failed].sort(byCreated), tone: 'text-rose/80' },
    {
      key: 'done',
      label: 'Finalizadas',
      jobs: [...done].sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0)),
      tone: 'text-green/80',
    },
    { key: 'canceled', label: 'Canceladas', jobs: [...canceled].sort(byCreated), tone: 'text-ink-3' },
  ].filter((group) => group.jobs.length > 0)

  const filtered = jobs.filter((job) => {
    if (filter === 'active') return ACTIVE.has(job.phase) || job.phase === 'queued'
    if (filter === 'done') return job.phase === 'done'
    if (filter === 'error') return job.phase === 'error' || job.phase === 'canceled'
    return true
  })

  const ordered = [...filtered].sort((a, b) => {
    const weight = (job: typeof a) =>
      ACTIVE.has(job.phase) ? 0 : job.phase === 'queued' ? 1 : job.phase === 'paused' ? 2 : job.phase === 'error' ? 3 : 4
    return weight(a) - weight(b) || byCreated(a, b)
  })

  const subtitle =
    activeCount || queued.length
      ? `${activeCount} activa${activeCount === 1 ? '' : 's'}${queued.length ? ` · ${queued.length} en cola` : ''}${remaining ? ` · ${formatBytes(remaining)} restantes` : ''}`
      : done.length
        ? `${done.length} finalizada${done.length === 1 ? '' : 's'}. Nada en curso.`
        : 'Nada en curso. Los enlaces que analices van a aparecer acá.'

  return (
    <div className="mx-auto w-full max-w-[1060px] px-6 py-5">
      <PageHeader
        title="Cola de descargas"
        subtitle={subtitle}
        actions={
          <>
            {active.length ? (
              <Button size="sm" variant="secondary" onClick={() => active.forEach((job) => void pause(job.id))}>
                <Pause className="size-3" strokeWidth={2} />
                Pausar todo
              </Button>
            ) : null}
            {paused.length ? (
              <Button size="sm" variant="secondary" onClick={() => paused.forEach((job) => void resume(job.id))}>
                <Play className="size-3" strokeWidth={2} />
                Reanudar
              </Button>
            ) : null}
            {done.length ? (
              <Button size="sm" variant="ghost" onClick={clearFinished}>
                <Trash2 className="size-3" strokeWidth={1.8} />
                Limpiar finalizadas
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Segmented
          value={filter}
          onChange={(next) => setFilter(next)}
          options={[
            { value: 'all', label: 'Todas', count: jobs.length },
            { value: 'active', label: 'Activas', count: active.length + queued.length },
            { value: 'done', label: 'Finalizadas', count: done.length },
            { value: 'error', label: 'Con error', count: failed.length + canceled.length },
          ]}
          label="Filtrar descargas"
        />

        <div className="flex items-center gap-3 font-mono text-[10px] text-ink-3">
          {speed > 0 ? (
            <span className="flex items-center gap-1.5 text-ink-2">
              <span className="size-1.5 rounded-full bg-cyan pulse-dot" />
              {formatSpeed(speed)}
            </span>
          ) : null}
          <span>{done.length} finalizadas</span>
        </div>
      </div>

      {filter === 'all' ? (
        groups.length ? (
          <div className="flex flex-col gap-5">
            {groups.map((group) => (
              <section key={group.key} aria-labelledby={`group-${group.key}`}>
                <div className="mb-1.5 flex items-center gap-2">
                  <h2
                    id={`group-${group.key}`}
                    className={`text-[10px] font-medium uppercase tracking-[0.14em] ${group.tone}`}
                  >
                    {group.label}
                  </h2>
                  <span className="font-mono text-[10px] text-ink-3">{group.jobs.length}</span>
                  <span className="h-px flex-1 bg-line" />
                </div>
                <div className="flex flex-col gap-1.5">
                  {group.jobs.map((job) => (
                    <QueueRow key={job.id} job={job} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState title="La cola está vacía" hint="Pegá un enlace en Descargar para verlo acá con progreso, velocidad y tiempo restante." />
        )
      ) : ordered.length ? (
        <div className="flex flex-col gap-1.5">
          {ordered.map((job) => (
            <QueueRow key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No hay descargas en este filtro"
          hint="Probá con otro filtro para ver el resto de la cola."
        />
      )}
    </div>
  )
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-surface/25 py-14 text-center">
      <div className="grid size-10 place-items-center rounded-lg border border-line bg-white/[0.025] text-ink-3">
        <ListVideo className="size-5" strokeWidth={1.6} />
      </div>
      <p className="mt-3 text-[12.5px] text-ink-2">{title}</p>
      <p className="mt-1 max-w-[300px] text-[11px] text-ink-3">{hint}</p>
    </div>
  )
}
