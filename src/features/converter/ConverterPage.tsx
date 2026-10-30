import { useEffect, useRef, useState } from 'react'
import { Check, FileAudio, FolderOpen, Loader2, Play, RefreshCw } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/Button'
import { Progress } from '../../components/ui/Progress'
import { Segmented } from '../../components/ui/Segmented'
import { useAppStore } from '../../store/useAppStore'
import { convert, isTauri, openPath, pickFile, subscribe } from '../../lib/engine'
import { buildConvertArgs, type ConvertSpec } from '../../lib/ytdlp'
import { cn } from '../../lib/cn'

const formats: Array<{ id: ConvertSpec['format']; label: string; hint: string }> = [
  { id: 'mp4', label: 'MP4', hint: 'H.264 + AAC' },
  { id: 'mkv', label: 'MKV', hint: 'Sin recodificar' },
  { id: 'webm', label: 'WebM', hint: 'VP9 + Opus' },
  { id: 'mp3', label: 'MP3', hint: '320 kbps' },
  { id: 'm4a', label: 'M4A', hint: 'AAC 256' },
  { id: 'wav', label: 'WAV', hint: 'PCM' },
  { id: 'gif', label: 'GIF', hint: '720 px · 15 fps' },
]

const audioFormats = new Set(['mp3', 'm4a', 'wav'])

export function ConverterPage() {
  const settings = useAppStore((state) => state.settings)
  const toast = useAppStore((state) => state.toast)
  const [input, setInput] = useState('')
  const [format, setFormat] = useState<ConvertSpec['format']>('mp4')
  const [quality, setQuality] = useState<'high' | 'balanced' | 'small'>('balanced')
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const jobId = useRef<string | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null
    void subscribe((event) => {
      if (!jobId.current || event.id !== jobId.current) return
      if (event.phase === 'done') {
        setRunning(false)
        setDone(event.filePath ?? 'Conversión terminada')
        toast({ tone: 'success', title: 'Conversión completa' })
        jobId.current = null
      }
      if (event.phase === 'error') {
        setRunning(false)
        setError(event.message ?? 'La conversión falló')
        jobId.current = null
      }
    }).then((fn) => {
      unsubscribe = fn
    })
    return () => unsubscribe?.()
  }, [toast])

  const outputPreview = input
    ? `${input.replace(/\.[^./\\]+$/, '')}.converted.${format}`
    : `Se guarda junto al original, como .converted.${format}`

  const start = async () => {
    if (!input.trim()) {
      setError('Elegí un archivo primero.')
      return
    }
    setError(null)
    setDone(null)
    setRunning(true)
    const id = crypto.randomUUID()
    jobId.current = id
    try {
      const args = buildConvertArgs({ input: input.trim(), outputDir: '', format, quality })
      await convert(id, args)
    } catch (reason) {
      setRunning(false)
      setError(reason instanceof Error ? reason.message : 'No se pudo iniciar la conversión')
      jobId.current = null
    }
  }

  return (
    <div className="mx-auto w-full max-w-[820px] px-6 py-5">
      <PageHeader
        title="Conversor"
        subtitle="Recodificá un archivo local sin volver a descargarlo."
      />

      <div className="flex flex-col gap-3">
        <section className="rounded-lg border border-line bg-surface/30 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11.5px] text-ink-2">Archivo de origen</p>
            <span className="text-[10px] text-ink-3">Ruta absoluta</span>
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[5px] border border-line bg-bg/60 px-2 focus-within:border-cyan/40">
              <FileAudio className="size-3.5 shrink-0 text-ink-3" strokeWidth={1.8} />
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="C:\\Videos\\clip.mov"
                aria-label="Ruta del archivo a convertir"
                spellCheck={false}
                className="h-full min-w-0 flex-1 bg-transparent font-mono text-[10.5px] text-ink placeholder:font-sans placeholder:text-ink-3"
              />
            </div>
            {isTauri ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const picked = await pickFile(input)
                  if (picked) setInput(picked)
                }}
              >
                <FolderOpen className="size-3" strokeWidth={1.8} />
                Examinar
              </Button>
            ) : null}
          </div>

          <p className="mt-1.5 truncate font-mono text-[9.5px] text-ink-3">{outputPreview}</p>
        </section>

        <section className="rounded-lg border border-line bg-surface/30 p-3.5">
          <p className="text-[11.5px] text-ink-2">Formato de salida</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
            {formats.map((option) => {
              const active = format === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFormat(option.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col items-start gap-0.5 rounded-md border px-2 py-1.5 text-left transition-colors',
                    active
                      ? 'border-cyan/45 bg-cyan/[0.055]'
                      : 'border-line bg-bg/40 hover:border-line-strong hover:bg-bg/70',
                  )}
                >
                  <span className="flex w-full items-center gap-1">
                    <span className="font-mono text-[11px] text-ink">{option.label}</span>
                    {active ? <Check className="ml-auto size-3 text-cyan" strokeWidth={2.6} /> : null}
                  </span>
                  <span className="truncate font-mono text-[9px] text-ink-3">{option.hint}</span>
                </button>
              )
            })}
          </div>

          {!audioFormats.has(format) && format !== 'gif' ? (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.1em] text-ink-3">Calidad</span>
              <Segmented
                value={quality}
                onChange={setQuality}
                label="Calidad de conversión"
                options={[
                  { value: 'high', label: 'Alta' },
                  { value: 'balanced', label: 'Balanceada' },
                  { value: 'small', label: 'Compacta' },
                ]}
              />
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-line bg-surface/30 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11.5px] text-ink-2">
                {running ? 'Convirtiendo…' : done ? 'Listo' : 'Salida'}
              </p>
              <p className="mt-0.5 truncate font-mono text-[9.5px] text-ink-3">
                {done ?? (running ? 'ffmpeg está procesando el archivo' : 'Elegí formato y confirmá')}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {done ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void openPath(settings.downloadDir)}
                >
                  <FolderOpen className="size-3" strokeWidth={1.8} />
                  Abrir
                </Button>
              ) : null}
              <Button size="md" variant="accent" onClick={() => void start()} disabled={running || !input.trim()}>
                {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                Convertir
              </Button>
            </div>
          </div>

          {running ? <Progress value={0.4} indeterminate className="mt-2.5" /> : null}

          {error ? (
            <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-rose/90" role="alert">
              <RefreshCw className="size-3" />
              {error}
            </p>
          ) : null}
        </section>

        <p className="px-1 text-[10px] leading-4 text-ink-3">
          El conversor usa el mismo ffmpeg del motor de descargas. Los archivos originales no se modifican: la salida
          lleva el sufijo <span className="font-mono text-ink-2">.converted</span>.
        </p>
      </div>
    </div>
  )
}
