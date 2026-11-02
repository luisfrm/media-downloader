import { useState } from 'react'
import { ArrowUpCircle, ChevronDown, RotateCw, X } from 'lucide-react'
import { useUpdaterStore, selectUpdateVisible } from '../store/useUpdaterStore'
import { cn } from '../lib/cn'

export function UpdateBanner() {
  const status = useUpdaterStore((state) => state.status)
  const info = useUpdaterStore((state) => state.info)
  const progress = useUpdaterStore((state) => state.progress)
  const error = useUpdaterStore((state) => state.error)
  const visible = useUpdaterStore((state) => selectUpdateVisible(state))
  const install = useUpdaterStore((state) => state.install)
  const relaunch = useUpdaterStore((state) => state.relaunch)
  const dismiss = useUpdaterStore((state) => state.dismiss)
  const skip = useUpdaterStore((state) => state.skip)
  const [showNotes, setShowNotes] = useState(false)

  if (!visible || !info) return null

  const percent = Math.round(progress.percent * 100)

  return (
    <div className="border-b border-cyan/20 bg-cyan/[0.055] px-4 py-2">
      <div className="mx-auto flex max-w-[980px] flex-wrap items-center gap-x-3 gap-y-2">
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-cyan/15 text-cyan">
          <ArrowUpCircle className="size-3.5" strokeWidth={1.9} />
        </span>

        <div className="min-w-0 flex-1">
          {status === 'available' ? (
            <p className="text-[11.5px] text-ink">
              <span className="font-mono text-cyan">v{info.version}</span> está disponible
              <button
                type="button"
                onClick={() => setShowNotes((value) => !value)}
                aria-expanded={showNotes}
                className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-ink-3 transition-colors hover:text-ink-2"
              >
                Notas
                <ChevronDown className={cn('size-3 transition-transform', showNotes && 'rotate-180')} strokeWidth={2} />
              </button>
            </p>
          ) : status === 'downloading' ? (
            <p className="flex items-center gap-2 text-[11.5px] text-ink-2">
              Descargando {info.version}
              <span className="font-mono text-[10px] text-cyan">{percent}%</span>
            </p>
          ) : status === 'ready' ? (
            <p className="text-[11.5px] text-ink">
              Actualización lista. Reiniciá la app para aplicar <span className="font-mono text-cyan">v{info.version}</span>.
            </p>
          ) : (
            <p className="text-[11.5px] text-rose">{error ?? 'No se pudo instalar la actualización.'}</p>
          )}

          {status === 'downloading' ? (
            <div className="mt-1 h-1 w-full max-w-[320px] overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan transition-[width] duration-200" style={{ width: `${percent}%` }} />
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {status === 'available' && (
            <>
              <button
                type="button"
                onClick={skip}
                className="rounded-md px-2 py-1.5 text-[10.5px] text-ink-3 transition-colors hover:bg-white/[0.05] hover:text-ink-2"
              >
                Omitir
              </button>
              <button
                type="button"
                onClick={() => void install()}
                className="inline-flex h-7 items-center gap-1.5 rounded-md bg-cyan px-2.5 text-[11px] font-semibold text-[#06212a] transition-colors hover:bg-cyan-soft"
              >
                Actualizar
              </button>
            </>
          )}

          {status === 'ready' && (
            <button
              type="button"
              onClick={() => void relaunch()}
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-cyan px-2.5 text-[11px] font-semibold text-[#06212a] transition-colors hover:bg-cyan-soft"
            >
              <RotateCw className="size-3" strokeWidth={2} />
              Reiniciar
            </button>
          )}

          {status === 'error' && (
            <button
              type="button"
              onClick={() => void install()}
              className="inline-flex h-7 items-center rounded-md border border-line px-2.5 text-[11px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              Reintentar
            </button>
          )}

          <button
            type="button"
            onClick={dismiss}
            aria-label="Ocultar la actualización por 7 días"
            className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-white/[0.05] hover:text-ink"
          >
            <X className="size-3.5" strokeWidth={1.9} />
          </button>
        </div>
      </div>

      {showNotes && info.notes ? (
        <div className="mx-auto mt-2 max-w-[980px] rounded-md border border-line bg-bg/50 px-3 py-2">
          <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap font-sans text-[10.5px] leading-4 text-ink-2">
            {info.notes}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
