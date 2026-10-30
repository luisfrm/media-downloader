import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleAlert, DownloadCloud } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { CommandBar } from './CommandBar'
import { PlatformStrip } from './PlatformStrip'
import { ResultCard, ResultSkeleton } from './ResultCard'
import { QueueSection } from '../queue/QueueSection'
import { RecentSection } from '../library/RecentSection'
import { useAppStore } from '../../store/useAppStore'
import * as engine from '../../lib/engine'
import { buildProbeArgs } from '../../lib/ytdlp'
import { normalizeMedia } from '../../lib/probe'
import { detectPlatform, looksLikeUrl, normalizeUrl } from '../../lib/platform'
import { friendlyProbeError, hasPlaylistParam } from '../../lib/errors'
import type { MediaInfo, Platform, RawInfo } from '../../lib/types'

export function HomePage() {
  const settings = useAppStore((state) => state.settings)
  const update = useAppStore((state) => state.updateSettings)
  const capabilities = useAppStore((state) => state.capabilities)
  const setRoute = useAppStore((state) => state.setRoute)

  const [url, setUrl] = useState('')
  const [target, setTarget] = useState<Platform | null>(null)
  const [probe, setProbe] = useState<MediaInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [playlistLoading, setPlaylistLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const detected = url.trim() ? detectPlatform(url) : target
  const platform = detected ?? 'other'
  const engineMissing = Boolean(capabilities && !capabilities.ytdlp)

  const analyze = useCallback(
    async (rawUrl?: string, playlist = false) => {
      const source = normalizeUrl(rawUrl ?? url)
      if (!source) {
        setError('Pegá un enlace primero.')
        inputRef.current?.focus()
        return
      }
      if (!looksLikeUrl(source)) {
        setError('Eso no parece un enlace. Debería empezar con https://')
        inputRef.current?.focus()
        return
      }
      if (engineMissing) {
        setError('El motor de descarga no está disponible. Revisá Ajustes → Motor.')
        return
      }

      if (playlist) setPlaylistLoading(true)
      else setLoading(true)
      setError(null)
      if (!playlist) setProbe(null)

      try {
        const raw = (await engine.probe(
          buildProbeArgs(source, {
            playlist,
            cookiesFromBrowser: settings.cookiesFromBrowser,
          }),
        )) as RawInfo

        const info = normalizeMedia(raw, {
          hasFfmpeg: capabilities ? Boolean(capabilities.ffmpeg) : true,
          preferredQuality: settings.preferredQuality,
          platformHint: detectPlatform(source),
        })

        if (!info.title) throw new Error('El enlace no devolvió información del contenido.')
        setProbe(info)
        setUrl(info.url || source)
        setTarget(null)
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : String(reason)
        setError(friendlyProbeError(message))
      } finally {
        setLoading(false)
        setPlaylistLoading(false)
      }
    },
    [capabilities, engineMissing, settings.cookiesFromBrowser, settings.preferredQuality, url],
  )

  const analyzeRef = useRef(analyze)
  analyzeRef.current = analyze

  const paste = useCallback(async () => {
    try {
      const text = await engine.readClipboard()
      if (!text) return
      setUrl(text.trim())
      if (looksLikeUrl(text)) void analyzeRef.current(text.trim())
      else inputRef.current?.focus()
    } catch {
      inputRef.current?.focus()
      setError('No se pudo leer el portapapeles. Pegalo con Ctrl V dentro del campo.')
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey
      if (!modifier || event.key.toLowerCase() !== 'v') return
      const active = document.activeElement
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return
      event.preventDefault()
      void paste()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [paste])

  useEffect(() => {
    if (!settings.clipboardWatch) return
    const onFocus = async () => {
      if (loading) return
      try {
        const text = (await engine.readClipboard()).trim()
        if (looksLikeUrl(text) && text !== url) {
          setUrl(text)
          setError(null)
        }
      } catch {
        // clipboard permission may be denied
      }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [settings.clipboardWatch, url, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const carriesLink = (event: DragEvent) => {
      const types = event.dataTransfer?.types
      if (!types) return false
      return Array.from(types).some((type) => type === 'text/uri-list' || type === 'text/plain')
    }

    const onDragOver = (event: DragEvent) => {
      if (!carriesLink(event)) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
      setDragging(true)
    }

    const onDragLeave = (event: DragEvent) => {
      if (event.relatedTarget === null) setDragging(false)
    }

    const onDrop = (event: DragEvent) => {
      if (!carriesLink(event)) return
      event.preventDefault()
      setDragging(false)
      const text =
        event.dataTransfer?.getData('text/uri-list') || event.dataTransfer?.getData('text/plain') || ''
      const link = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => looksLikeUrl(line))
      if (link) {
        setUrl(link)
        void analyzeRef.current(link)
      }
    }

    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  const reset = () => {
    setProbe(null)
    setError(null)
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }

  const suggestPlaylist = Boolean(
    probe && !probe.playlist && hasPlaylistParam(probe.url || url),
  )

  return (
    <div className="mx-auto w-full max-w-[1060px] px-6 py-5">
      <PageHeader
        title="Descargar"
        subtitle="YouTube, X, TikTok, Instagram y Facebook. Un enlace, la calidad que elijas, y listo."
      />

      {engineMissing ? (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-amber/25 bg-amber/[0.05] px-2.5 py-2 text-[11px] text-amber/90">
          <CircleAlert className="size-3.5 shrink-0" />
          No se detectó yt-dlp en este equipo.
          <button
            type="button"
            onClick={() => setRoute('settings')}
            className="ml-1 underline decoration-amber/40 underline-offset-2 hover:decoration-amber"
          >
            Revisá Ajustes → Motor
          </button>
        </div>
      ) : null}

      <CommandBar
        value={url}
        onChange={(value) => {
          setUrl(value)
          setError(null)
          if (!value.trim()) setProbe(null)
        }}
        onSubmit={() => void analyze()}
        onPaste={() => void paste()}
        loading={loading}
        platform={platform}
        error={error}
        inputRef={inputRef}
        preset={settings.preferredQuality}
        onPreset={(value) => update({ preferredQuality: value })}
        folder={settings.downloadDir}
        onPickFolder={async () => {
          const picked = await engine.pickFolder(settings.downloadDir)
          if (picked) update({ downloadDir: picked })
          else if (!engine.isTauri) {
            useAppStore.getState().toast({
              tone: 'info',
              title: 'Elegí la carpeta en Ajustes',
              description: 'En la vista previa web, editá la ruta a mano.',
            })
            setRoute('settings')
          }
        }}
        clipboardWatch={settings.clipboardWatch}
        onClipboardWatch={(value) => update({ clipboardWatch: value })}
      />

      <div className="mt-3">
        <PlatformStrip
          active={detected}
          onSelect={(value) => {
            setTarget(value)
            inputRef.current?.focus()
          }}
        />
      </div>

      {loading ? (
        <div className="mt-4">
          <ResultSkeleton />
        </div>
      ) : null}

      {probe && !loading ? (
        <div className="mt-4">
          <ResultCard
            key={probe.id}
            media={probe}
            onDiscard={reset}
            onAnalyzePlaylist={suggestPlaylist ? () => void analyze(probe.url || url, true) : undefined}
            playlistLoading={playlistLoading}
          />
        </div>
      ) : null}

      <div className="mt-6">
        <QueueSection limit={3} />
      </div>

      <RecentSection />

      {dragging ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 top-11 z-[70] bg-bg/85 backdrop-blur-[2px]">
          <div className="absolute inset-3 grid place-items-center rounded-xl border-2 border-dashed border-cyan/35">
            <div className="text-center">
              <DownloadCloud className="mx-auto size-7 text-cyan" strokeWidth={1.6} />
              <p className="mt-2 text-[14px] text-ink">Soltá el enlace para analizarlo</p>
              <p className="mt-0.5 text-[11px] text-ink-3">YouTube, X, TikTok, Instagram o Facebook</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
