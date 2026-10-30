import { useRef } from 'react'
import { CircleAlert, FolderOpen, Minus, Plus, RefreshCw, ShieldCheck, Terminal } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Select } from '../../components/ui/Select'
import { Toggle } from '../../components/ui/Toggle'
import { useAppStore } from '../../store/useAppStore'
import { openPath, pickFolder } from '../../lib/engine'
import { clamp, truncateMiddle } from '../../lib/format'
import { cn } from '../../lib/cn'
import { DEFAULT_FILENAME_TEMPLATE } from '../../lib/ytdlp'
import type { Settings } from '../../lib/types'

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface/30">
      <header className="border-b border-line px-3.5 py-2.5">
        <h2 className="text-[12.5px] text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-[10.5px] text-ink-3">{description}</p> : null}
      </header>
      <div className="divide-y divide-line/70">{children}</div>
    </section>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-[11.5px] text-ink-2">{label}</p>
        {hint ? <p className="mt-0.5 text-[10px] leading-4 text-ink-3">{hint}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const settings = useAppStore((state) => state.settings)
  const update = useAppStore((state) => state.updateSettings)
  const capabilities = useAppStore((state) => state.capabilities)
  const refresh = useAppStore((state) => state.refreshCapabilities)
  const toast = useAppStore((state) => state.toast)
  const folderInput = useRef<HTMLInputElement>(null)

  const chooseFolder = async () => {
    const picked = await pickFolder(settings.downloadDir)
    if (picked) {
      update({ downloadDir: picked })
      toast({ tone: 'info', title: 'Carpeta actualizada', description: picked })
    } else {
      folderInput.current?.focus()
      folderInput.current?.select()
    }
  }

  const verify = async () => {
    await refresh()
    const current = useAppStore.getState().capabilities
    toast({
      tone: current?.ytdlp ? 'success' : 'error',
      title: current?.ytdlp ? 'Motor verificado' : 'Motor no encontrado',
      description: current?.ytdlp ? `yt-dlp ${current.ytdlp} · ffmpeg ${current.ffmpeg ?? 'no detectado'}` : undefined,
    })
  }

  return (
    <div className="mx-auto w-full max-w-[820px] px-6 py-5">
      <PageHeader
        title="Ajustes"
        subtitle="Se guardan automáticamente en este equipo."
        actions={
          <span className="inline-flex items-center gap-1.5 text-[10.5px] text-ink-3">
            <ShieldCheck className="size-3 text-green/80" strokeWidth={1.8} />
            Local, sin cuenta
          </span>
        }
      />

      <div className="flex flex-col gap-3">
        <Section title="Descargas" description="Dónde y cómo se guardan tus archivos.">
          <div className="px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11.5px] text-ink-2">Carpeta de destino</p>
                <p className="mt-0.5 text-[10px] text-ink-3">Podés cambiarla cuando quieras, incluso por descarga.</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => void chooseFolder()}>
                  <FolderOpen className="size-3" strokeWidth={1.8} />
                  Examinar
                </Button>
                <IconButton label="Abrir carpeta de descargas" size="sm" onClick={() => void openPath(settings.downloadDir)}>
                  <FolderOpen className="size-3.5" strokeWidth={1.8} />
                </IconButton>
              </div>
            </div>
            <input
              ref={folderInput}
              value={settings.downloadDir}
              onChange={(event) => update({ downloadDir: event.target.value })}
              aria-label="Ruta de la carpeta de descargas"
              className="mt-2 h-8 w-full rounded-[5px] border border-line bg-bg/60 px-2 font-mono text-[10.5px] text-ink-2 focus:border-cyan/40"
            />
          </div>

          <Row label="Descargas simultáneas" hint="Más conexiones saturan la red y el disco.">
            <div className="flex items-center gap-1">
              <IconButton
                label="Menos descargas simultáneas"
                size="sm"
                onClick={() => update({ concurrency: clamp(settings.concurrency - 1, 1, 8) })}
              >
                <Minus className="size-3" strokeWidth={2} />
              </IconButton>
              <span className="w-6 text-center font-mono text-[12px] text-ink">{settings.concurrency}</span>
              <IconButton
                label="Más descargas simultáneas"
                size="sm"
                onClick={() => update({ concurrency: clamp(settings.concurrency + 1, 1, 8) })}
              >
                <Plus className="size-3" strokeWidth={2} />
              </IconButton>
            </div>
          </Row>

          <Row label="Calidad preferida" hint="Preselecciona la opción al analizar un enlace.">
            <Select
              value={settings.preferredQuality}
              onChange={(value) => update({ preferredQuality: value as Settings['preferredQuality'] })}
              label="Calidad preferida"
              className="w-[132px]"
              size="md"
              options={[
                { value: 'best', label: 'Mejor calidad' },
                { value: '1080', label: '1080p' },
                { value: '720', label: '720p' },
                { value: 'audio', label: 'Solo audio' },
              ]}
            />
          </Row>

          <div className="px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11.5px] text-ink-2">Plantilla de nombre</p>
                <p className="mt-0.5 text-[10px] text-ink-3">
                  Tokens de yt-dlp: %(title)s, %(id)s, %(ext)s, %(uploader)s.
                </p>
              </div>
              <button
                type="button"
                onClick={() => update({ filenameTemplate: DEFAULT_FILENAME_TEMPLATE })}
                className="text-[10px] text-ink-3 transition-colors hover:text-cyan"
              >
                Restablecer
              </button>
            </div>
            <input
              value={settings.filenameTemplate}
              onChange={(event) => update({ filenameTemplate: event.target.value })}
              aria-label="Plantilla de nombre de archivo"
              spellCheck={false}
              className="mt-2 h-8 w-full rounded-[5px] border border-line bg-bg/60 px-2 font-mono text-[10.5px] text-ink-2 focus:border-cyan/40"
            />
          </div>

          <Row label="Incrustar metadatos" hint="Título, autor, fecha y carátula en el archivo final.">
            <Toggle
              checked={settings.embedMetadata}
              onChange={(value) => update({ embedMetadata: value })}
              label="Incrustar metadatos"
            />
          </Row>
          <Row label="Incrustar miniatura" hint="Requiere ffmpeg.">
            <Toggle
              checked={settings.embedThumbnail}
              onChange={(value) => update({ embedThumbnail: value })}
              label="Incrustar miniatura"
            />
          </Row>
          <Row label="Detectar enlaces copiados" hint="Al volver a la ventana, lee el portapapeles.">
            <Toggle
              checked={settings.clipboardWatch}
              onChange={(value) => update({ clipboardWatch: value })}
              label="Detectar enlaces copiados"
            />
          </Row>
        </Section>

        <Section title="Motor de descarga" description="yt-dlp resuelve los enlaces; ffmpeg fusiona y convierte.">
          <Row label="yt-dlp" hint={truncateMiddle(capabilities?.binDir ?? 'sin ruta', 52)}>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 font-mono text-[10px]',
                capabilities?.ytdlp
                  ? 'border-green/25 bg-green/[0.08] text-green'
                  : 'border-amber/25 bg-amber/[0.08] text-amber',
              )}
            >
              {capabilities?.ytdlp ?? 'no detectado'}
            </span>
          </Row>
          <Row label="ffmpeg" hint="Necesario para 4K, MP3/FLAC y fusión de streams.">
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 font-mono text-[10px]',
                capabilities?.ffmpeg
                  ? 'border-green/25 bg-green/[0.08] text-green'
                  : 'border-amber/25 bg-amber/[0.08] text-amber',
              )}
            >
              {capabilities?.ffmpeg ?? 'no detectado'}
            </span>
          </Row>
          <div className="px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <Terminal className="mt-0.5 size-3.5 shrink-0 text-ink-3" strokeWidth={1.8} />
                <p className="text-[10.5px] leading-4 text-ink-3">
                  En desarrollo, ejecutá <span className="font-mono text-ink-2">npm run setup:engine</span> para dejar los
                  binarios en <span className="font-mono text-ink-2">src-tauri/binaries</span>.
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => void verify()}>
                <RefreshCw className="size-3" strokeWidth={1.9} />
                Reverificar
              </Button>
            </div>

            {!capabilities?.ffmpeg ? (
              <p className="mt-2 flex items-start gap-1.5 rounded-md border border-amber/25 bg-amber/[0.06] px-2 py-1.5 text-[10px] leading-4 text-amber/90">
                <CircleAlert className="mt-0.5 size-3 shrink-0" />
                Sin ffmpeg podés bajar MP4 progressive, pero no fusionar 1080p+ ni convertir a MP3.
              </p>
            ) : null}
          </div>
        </Section>

        <Section
          title="Sesiones y cookies"
          description="Instagram, Facebook y algunos videos de YouTube requieren una sesión iniciada."
        >
          <Row label="Leer cookies de" hint="Se leen en tu equipo; nunca se envían a un servidor propio.">
            <Select
              value={settings.cookiesFromBrowser}
              onChange={(value) => update({ cookiesFromBrowser: value as Settings['cookiesFromBrowser'] })}
              label="Navegador del que se leen las cookies"
              className="w-[124px]"
              size="md"
              options={[
                { value: 'none', label: 'No usar' },
                { value: 'chrome', label: 'Chrome' },
                { value: 'edge', label: 'Edge' },
                { value: 'firefox', label: 'Firefox' },
                { value: 'brave', label: 'Brave' },
                { value: 'safari', label: 'Safari' },
              ]}
            />
          </Row>
          <div className="px-3.5 py-2.5 text-[10px] leading-4 text-ink-3">
            Descargá solo contenido que tengas derecho a usar. La app no evade DRM ni accede a contenido privado.
          </div>
        </Section>

        <Section title="Apariencia">
          <Row label="Reducir animaciones" hint="Desactiva pulsos y transiciones decorativas.">
            <Toggle
              checked={settings.reduceMotion}
              onChange={(value) => update({ reduceMotion: value })}
              label="Reducir animaciones"
            />
          </Row>
        </Section>

        <div className="flex items-center justify-between px-1 pb-4 text-[10px] text-ink-3">
          <span>Media Downloader 0.1.0</span>
          <span className="font-mono">
            {capabilities?.platform ?? 'web'} · yt-dlp {capabilities?.ytdlp ?? '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
