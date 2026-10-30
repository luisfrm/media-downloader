import { useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  FolderClosed,
  ListVideo,
  Play,
  Subtitles,
  TriangleAlert,
  X,
} from 'lucide-react'
import { BrandIcon } from '../../components/BrandIcon'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { Checkbox } from '../../components/ui/Toggle'
import { IconButton } from '../../components/ui/IconButton'
import { Segmented } from '../../components/ui/Segmented'
import { Select } from '../../components/ui/Select'
import { cn } from '../../lib/cn'
import { formatBytes, formatCompact, formatDuration, formatUploadDate } from '../../lib/format'
import { PLATFORMS } from '../../lib/platform'
import { toPlaylistRanges } from '../../lib/selection'
import type { AudioOption, DownloadMode, MediaInfo, SubtitleTrack, VideoOption } from '../../lib/types'
import { buildDownloadArgs, type DownloadSpec } from '../../lib/ytdlp'
import { openExternal, openPath } from '../../lib/engine'
import { useAppStore } from '../../store/useAppStore'
import { useDownloadsStore } from '../../store/useDownloadsStore'

interface ResultCardProps {
  media: MediaInfo
  onDiscard: () => void
  onAnalyzePlaylist?: () => void
  playlistLoading?: boolean
}

const tabs: Array<{ value: DownloadMode; label: string }> = [
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'thumbnail', label: 'Miniatura' },
  { value: 'subtitles', label: 'Subtítulos' },
]

export function ResultCard({ media, onDiscard, onAnalyzePlaylist, playlistLoading }: ResultCardProps) {
  const settings = useAppStore((state) => state.settings)
  const capabilities = useAppStore((state) => state.capabilities)
  const toast = useAppStore((state) => state.toast)
  const enqueue = useDownloadsStore((state) => state.enqueue)

  const hasFfmpeg = capabilities ? Boolean(capabilities.ffmpeg) : true
  const [tab, setTab] = useState<DownloadMode>(media.videoOptions.length ? 'video' : 'audio')
  const [videoId, setVideoId] = useState(
    media.videoOptions.find((option) => option.recommended)?.id ?? media.videoOptions[0]?.id ?? '',
  )
  const [audioId, setAudioId] = useState(
    media.audioOptions.find((option) => option.recommended)?.id ?? media.audioOptions[0]?.id ?? '',
  )
  const [container, setContainer] = useState<'auto' | 'mp4' | 'mkv' | 'webm'>('mp4')
  const [embedThumb, setEmbedThumb] = useState(settings.embedThumbnail)
  const [embedMeta, setEmbedMeta] = useState(settings.embedMetadata)
  const [subFormat, setSubFormat] = useState<'srt' | 'vtt'>('srt')
  const [subEmbed, setSubEmbed] = useState(false)
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(media.playlist?.entries.map((entry) => entry.id) ?? []),
  )
  const [subLangs, setSubLangs] = useState<Set<string>>(() => {
    const manual = media.subtitles.filter((track) => !track.auto)
    const preferred =
      manual.find((track) => track.lang.startsWith('es')) ??
      manual.find((track) => track.lang.startsWith('en')) ??
      manual[0]
    return new Set(preferred ? [preferred.lang] : [])
  })

  const video = media.videoOptions.find((option) => option.id === videoId) ?? media.videoOptions[0]
  const audio = media.audioOptions.find((option) => option.id === audioId) ?? media.audioOptions[0]
  const meta = PLATFORMS[media.platform]

  const playlistSelected = useMemo(
    () => media.playlist?.entries.filter((entry) => selected.has(entry.id)) ?? [],
    [media.playlist, selected],
  )

  const subtitleTracks = media.subtitles
  const selectedSubtitleTracks = subtitleTracks.filter((track) => subLangs.has(track.lang))
  const missingFfmpeg = tab === 'audio' && audio?.needsFfmpeg && !hasFfmpeg
  const videoNeedsFfmpeg = tab === 'video' && !hasFfmpeg && Boolean(video?.needsMerge)

  const size =
    tab === 'video' ? video?.sizeBytes : tab === 'audio' ? audio?.sizeBytes : null

  const canSubmit =
    !missingFfmpeg &&
    !videoNeedsFfmpeg &&
    (tab !== 'video' || Boolean(video)) &&
    (tab !== 'audio' || Boolean(audio)) &&
    (tab !== 'subtitles' || subLangs.size > 0) &&
    (tab === 'thumbnail' || !media.playlist || playlistSelected.length > 0)

  const submit = () => {
    if (!canSubmit) return

    const allSelected = media.playlist ? playlistSelected.length === media.playlist.entries.length : true
    const spec: DownloadSpec = {
      url: media.url,
      outputDir: settings.downloadDir,
      mode: tab,
      filenameTemplate: settings.filenameTemplate,
      embedThumbnail: tab === 'video' || tab === 'audio' ? embedThumb : false,
      embedMetadata: tab === 'video' || tab === 'audio' ? embedMeta : false,
      subtitleLangs: [...subLangs],
      subtitleFormat: subFormat,
      subtitleAuto: selectedSubtitleTracks.some((track) => track.auto),
      subtitleEmbed: tab === 'video' && subEmbed,
      cookiesFromBrowser: settings.cookiesFromBrowser,
      windowsFilenames: /Windows/i.test(navigator.userAgent),
      concurrency: 4,
      playlist: Boolean(media.playlist),
      playlistItems:
        media.playlist && !allSelected
          ? toPlaylistRanges(playlistSelected.map((entry) => entry.index + 1))
          : undefined,
    }

    if (tab === 'video' && video) {
      spec.selector = video.selector
      spec.container = container
      spec.naturalContainer = video.container
      spec.needsMerge = video.needsMerge
    }

    if (tab === 'audio' && audio) {
      spec.audioFormat = audio.audioFormat
      spec.audioBitrate =
        audio.audioFormat === 'mp3' && audio.bitrateKbps === 320
          ? '320K'
          : audio.audioFormat === 'm4a' && audio.bitrateKbps === 256
            ? '256K'
            : '0'
    }

    const qualityLabel =
      tab === 'video' && video
        ? `${video.label}${video.fps && video.fps >= 50 ? video.fps : ''} · ${container === 'auto' ? video.container.toUpperCase() : container.toUpperCase()}`
        : tab === 'audio' && audio
          ? audio.label
          : tab === 'thumbnail'
            ? 'Miniatura · JPG'
            : `${subLangs.size} ${subLangs.size === 1 ? 'pista' : 'pistas'} · ${subFormat.toUpperCase()}`

    const detail =
      tab === 'video' && video
        ? `${video.codec}${video.needsMerge ? ' · merge' : ''}`
        : tab === 'audio' && audio
          ? audio.detail
          : tab === 'thumbnail'
            ? 'Resolución original'
            : selectedSubtitleTracks.map((track) => track.name).join(', ')

    const playlistCount = media.playlist ? playlistSelected.length : null

    enqueue({
      url: media.url,
      title: media.title,
      author: media.author,
      platform: media.platform,
      thumbnail: media.thumbnail,
      mode: tab,
      qualityLabel,
      detail,
      outputDir: settings.downloadDir,
      totalBytes: tab === 'thumbnail' ? null : size,
      playlistTotal: playlistCount,
      args: buildDownloadArgs(spec),
    })

    toast({
      tone: 'success',
      title: media.playlist ? 'Playlist en cola' : 'En cola',
      description: media.playlist
        ? `${playlistSelected.length} videos · ${media.title}`
        : media.title,
    })
    onDiscard()
  }

  const togglePlaylist = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSubtitle = (track: SubtitleTrack) => {
    setSubLangs((current) => {
      const next = new Set(current)
      if (next.has(track.lang)) next.delete(track.lang)
      else next.add(track.lang)
      return next
    })
  }

  return (
    <section className="animate-rise overflow-hidden rounded-xl border border-line bg-surface/45">
      <div className="flex flex-col gap-3 p-3 sm:flex-row">
        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg border border-line bg-bg sm:w-[228px]">
          {media.thumbnail ? (
            <>
              <img
                src={media.thumbnail}
                alt=""
                aria-hidden
                className="absolute inset-0 size-full scale-110 object-cover opacity-35 blur-xl"
                referrerPolicy="no-referrer"
              />
              <img
                src={media.thumbnail}
                alt={`Miniatura de ${media.title}`}
                className="relative size-full object-contain"
                referrerPolicy="no-referrer"
              />
            </>
          ) : (
            <div className="grid size-full place-items-center text-ink-3">
              <BrandIcon platform={media.platform} size={28} />
            </div>
          )}

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-1.5">
            <Chip tone="neutral" className="bg-bg/80 backdrop-blur">
              {media.isLive ? 'EN VIVO' : media.videoOptions[0]?.label ?? '—'}
            </Chip>
            {media.durationSec > 0 ? (
              <Chip tone="neutral" className="bg-bg/80 backdrop-blur">
                <Clock className="size-2.5" /> {formatDuration(media.durationSec)}
              </Chip>
            ) : null}
          </div>

          <a
            href={media.url}
            onClick={(event) => {
              event.preventDefault()
              void openExternal(media.url)
            }}
            aria-label="Abrir el enlace original"
            className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100"
          >
            <span className="grid size-9 place-items-center rounded-full border border-white/15 bg-bg/80 text-ink shadow-lg backdrop-blur">
              <Play className="size-3.5 translate-x-px" fill="currentColor" />
            </span>
          </a>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/[0.035] px-1.5 py-0.5">
                <BrandIcon platform={media.platform} size={11} className="text-ink-2" />
                <span className="text-[10.5px] text-ink-2">{meta.name}</span>
              </span>
              {media.author ? <span className="truncate text-ink-2">{media.author}</span> : null}
              {media.viewCount ? (
                <>
                  <span className="text-ink-3/60">·</span>
                  <span>{formatCompact(media.viewCount)} vistas</span>
                </>
              ) : null}
              {formatUploadDate(media.publishedAt) ? (
                <>
                  <span className="text-ink-3/60">·</span>
                  <span>{formatUploadDate(media.publishedAt)}</span>
                </>
              ) : null}
              {media.ageRestricted ? <Chip tone="amber">+18</Chip> : null}
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <IconButton label="Abrir enlace original" size="sm" onClick={() => void openExternal(media.url)}>
                <ExternalLink className="size-3.5" strokeWidth={1.8} />
              </IconButton>
              <IconButton label="Descartar resultado" size="sm" onClick={onDiscard}>
                <X className="size-3.5" strokeWidth={1.8} />
              </IconButton>
            </div>
          </div>

          <h2 className="mt-1.5 line-clamp-2 text-[16.5px] leading-[1.32] text-ink">{media.title}</h2>

          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
            <Chip tone="neutral">{media.videoOptions.length} calidades</Chip>
            {media.subtitles.length ? <Chip tone="neutral">{media.subtitles.length} subtítulos</Chip> : null}
            {media.playlist ? (
              <Chip tone="cyan">
                <ListVideo className="size-2.5" /> {media.playlist.count} videos
              </Chip>
            ) : null}
            {media.playlist?.truncated ? (
              <span className="text-[10px] text-ink-3">
                · mostrando {media.playlist.entries.length}
              </span>
            ) : null}
            {onAnalyzePlaylist ? (
              <button
                type="button"
                onClick={onAnalyzePlaylist}
                disabled={playlistLoading}
                className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-cyan/80 transition-colors hover:text-cyan disabled:opacity-50"
              >
                {playlistLoading ? 'Leyendo playlist…' : 'Analizar playlist completa'}
                <ChevronDown className="size-3 -rotate-90" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-3 h-px bg-line" />

      {media.playlist ? (
        <div className="mx-3 mt-3 overflow-hidden rounded-lg border border-line bg-bg/40">
          <button
            type="button"
            onClick={() => setPlaylistOpen((open) => !open)}
            className="flex h-9 w-full items-center gap-2 px-2.5 text-left transition-colors hover:bg-white/[0.03]"
          >
            <ListVideo className="size-3.5 text-ink-3" strokeWidth={1.8} />
            <span className="text-[11.5px] text-ink-2">Contenido de la playlist</span>
            <span className="font-mono text-[10px] text-ink-3">{selected.size}/{media.playlist.entries.length}</span>
            <ChevronDown
              className={cn('ml-auto size-3.5 text-ink-3 transition-transform', playlistOpen && 'rotate-180')}
            />
          </button>

          {playlistOpen ? (
            <div className="max-h-44 overflow-y-auto border-t border-line">
              {media.playlist.entries.map((entry) => (
                <label
                  key={entry.id}
                  className="flex h-8 cursor-pointer items-center gap-2 px-2.5 transition-colors hover:bg-white/[0.03]"
                >
                  <Checkbox
                    checked={selected.has(entry.id)}
                    onChange={() => togglePlaylist(entry.id)}
                    label={`Seleccionar ${entry.title}`}
                  />
                  <span className="w-6 shrink-0 font-mono text-[10px] text-ink-3">{entry.index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-2">{entry.title}</span>
                  <span className="shrink-0 font-mono text-[10px] text-ink-3">
                    {entry.durationSec ? formatDuration(entry.durationSec) : '—'}
                  </span>
                </label>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-line px-2.5 py-1.5">
            <span className="text-[10px] text-ink-3">
              Se descargan en orden, uno por vez
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelected(
                    new Set(media.playlist?.entries.slice(0, 50).map((entry) => entry.id) ?? []),
                  )
                }
                className="text-[10.5px] text-ink-3 transition-colors hover:text-ink-2"
              >
                Primeros 50
              </button>
              <span className="text-ink-3/40">·</span>
              <button
                type="button"
                onClick={() => setSelected(new Set(media.playlist?.entries.map((entry) => entry.id) ?? []))}
                className="text-[10.5px] text-ink-3 transition-colors hover:text-ink-2"
              >
                Todos
              </button>
              <span className="text-ink-3/40">·</span>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-[10.5px] text-ink-3 transition-colors hover:text-ink-2"
              >
                Ninguno
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented
            value={tab}
            onChange={(value) => setTab(value)}
            options={tabs.map((item) => ({
              ...item,
              disabled:
                (item.value === 'video' && !media.videoOptions.length) ||
                (item.value === 'subtitles' && !media.subtitles.length),
            }))}
            label="Tipo de descarga"
          />
          {!hasFfmpeg ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber/80">
              <TriangleAlert className="size-3" /> ffmpeg no detectado
            </span>
          ) : (
            <span className="font-mono text-[9.5px] text-ink-3">
              {media.playlist ? 'Calidad objetivo para la playlist' : 'Formatos leídos del origen'}
            </span>
          )}
        </div>

        <div className="mt-2.5">
          {tab === 'video' && video ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {media.videoOptions.map((option) => (
                  <VideoOptionRow
                    key={option.id}
                    option={option}
                    selected={option.id === video.id}
                    disabled={!hasFfmpeg && option.needsMerge}
                    onSelect={() => setVideoId(option.id)}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-[0.1em] text-ink-3">Contenedor</span>
                  <Select
                    value={container}
                    onChange={(value) => setContainer(value as typeof container)}
                    label="Contenedor de salida"
                    className="w-[104px]"
                    options={[
                      { value: 'mp4', label: 'MP4', hint: 'Máxima compatibilidad' },
                      { value: 'mkv', label: 'MKV', hint: 'Todos los códecs' },
                      { value: 'webm', label: 'WebM', hint: 'VP9 / AV1' },
                      { value: 'auto', label: 'Original', hint: 'Sin remux' },
                    ]}
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-ink-3">
                  <Checkbox
                    checked={embedMeta}
                    onChange={setEmbedMeta}
                    label="Incrustar metadatos"
                  />
                  Metadatos
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-ink-3">
                  <Checkbox
                    checked={embedThumb}
                    onChange={setEmbedThumb}
                    label="Incrustar miniatura"
                  />
                  Miniatura
                </label>

                {media.subtitles.length ? (
                  <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-ink-3">
                    <Checkbox checked={subEmbed} onChange={setSubEmbed} label="Incrustar subtítulos" />
                    Subtítulos
                  </label>
                ) : null}
              </div>

              {videoNeedsFfmpeg ? (
                <p className="flex items-center gap-1.5 rounded-md border border-amber/25 bg-amber/[0.06] px-2 py-1.5 text-[10.5px] text-amber/90">
                  <TriangleAlert className="size-3 shrink-0" />
                  Esta calidad necesita fusionar video y audio. Instalá ffmpeg desde Ajustes o elegí una calidad
                  progressive.
                </p>
              ) : null}
            </div>
          ) : null}

          {tab === 'audio' ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {media.audioOptions.map((option) => (
                  <AudioOptionRow
                    key={option.id}
                    option={option}
                    selected={option.id === audio?.id}
                    onSelect={() => setAudioId(option.id)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-ink-3">
                  <Checkbox checked={embedMeta} onChange={setEmbedMeta} label="Incrustar metadatos de audio" />
                  Metadatos
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-ink-3">
                  <Checkbox checked={embedThumb} onChange={setEmbedThumb} label="Incrustar carátula" />
                  Carátula
                </label>
              </div>
              {missingFfmpeg ? (
                <p className="flex items-center gap-1.5 rounded-md border border-amber/25 bg-amber/[0.06] px-2 py-1.5 text-[10.5px] text-amber/90">
                  <TriangleAlert className="size-3 shrink-0" />
                  Convertir a {audio?.label} requiere ffmpeg. Elegí “Audio original” o instalá ffmpeg.
                </p>
              ) : null}
            </div>
          ) : null}

          {tab === 'thumbnail' ? (
            <div className="flex items-center gap-3 rounded-lg border border-line bg-bg/40 p-2.5">
              {media.thumbnail ? (
                <img
                  src={media.thumbnail}
                  alt=""
                  className="h-16 w-24 rounded border border-line object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <div className="min-w-0">
                <p className="text-[12px] text-ink">Miniatura en resolución original</p>
                <p className="mt-0.5 text-[10.5px] text-ink-3">
                  Se guarda como JPG junto al resto de tus descargas.
                </p>
              </div>
            </div>
          ) : null}

          {tab === 'subtitles' ? (
            <div className="flex flex-col gap-2">
              {subtitleTracks.length ? (
                <>
                  <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
                    {subtitleTracks.map((track) => (
                      <button
                        key={track.lang}
                        type="button"
                        onClick={() => toggleSubtitle(track)}
                        className={cn(
                          'flex h-8 items-center gap-2 rounded-md border px-2 text-left transition-colors',
                          subLangs.has(track.lang)
                            ? 'border-cyan/40 bg-cyan/[0.05]'
                            : 'border-line bg-bg/40 hover:border-line-strong',
                        )}
                      >
                        <span
                          className={cn(
                            'grid size-3.5 place-items-center rounded-full border',
                            subLangs.has(track.lang) ? 'border-cyan' : 'border-ink-3',
                          )}
                        >
                          {subLangs.has(track.lang) ? <Check className="size-2.5 text-cyan" strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-2">{track.name}</span>
                        <span className="font-mono text-[9.5px] text-ink-3">{track.lang}</span>
                        {track.auto ? <Chip tone="neutral">auto</Chip> : null}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-[0.1em] text-ink-3">Formato</span>
                      <Segmented
                        value={subFormat}
                        onChange={(value) => setSubFormat(value)}
                        options={[
                          { value: 'srt', label: 'SRT' },
                          { value: 'vtt', label: 'VTT' },
                        ]}
                        label="Formato de subtítulos"
                      />
                    </div>
                    <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-ink-3">
                      <Checkbox checked={subEmbed} onChange={setSubEmbed} label="Incrustar en el video" />
                      Incrustar en el video
                    </label>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-line bg-bg/40 px-3 py-3 text-[11.5px] text-ink-3">
                  <Subtitles className="size-4" />
                  Este recurso no publica subtítulos.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-bg/20 px-3 py-2.5">
        <button
          type="button"
          onClick={() => void openPath(settings.downloadDir)}
          title={settings.downloadDir}
          className="flex min-w-0 items-center gap-1.5 text-ink-3 transition-colors hover:text-ink-2"
        >
          <FolderClosed className="size-3 shrink-0" strokeWidth={1.8} />
          <span className="max-w-[240px] truncate font-mono text-[10px]">{settings.downloadDir}</span>
          <span className="text-[10px] text-cyan/70">Abrir</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="mr-1 hidden font-mono text-[10px] text-ink-3 sm:inline">
            {tab === 'subtitles'
              ? `${subLangs.size} pistas`
              : tab === 'thumbnail'
                ? 'JPG'
                : media.playlist
                  ? `${playlistSelected.length} videos`
                  : formatBytes(size)}
          </span>
          <Button variant="ghost" size="md" onClick={onDiscard}>
            Descartar
          </Button>
          <Button variant="accent" size="lg" onClick={submit} disabled={!canSubmit} className="h-8 px-3.5">
            <Download className="size-3.5" strokeWidth={2.2} />
            {media.playlist ? `Descargar ${playlistSelected.length}` : 'Descargar'}
          </Button>
        </div>
      </div>
    </section>
  )
}

function VideoOptionRow({
  option,
  selected,
  disabled,
  onSelect,
}: {
  option: VideoOption
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      title={disabled ? 'Requiere ffmpeg para fusionar streams' : undefined}
      className={cn(
        'group flex flex-col gap-1 rounded-md border px-2 py-1.5 text-left transition-colors duration-150',
        selected
          ? 'border-cyan/45 bg-cyan/[0.055]'
          : 'border-line bg-bg/40 hover:border-line-strong hover:bg-bg/70',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            'grid size-3.5 shrink-0 place-items-center rounded-full border transition-colors',
            selected ? 'border-cyan' : 'border-ink-3/70',
          )}
        >
          {selected ? <span className="size-1.5 rounded-full bg-cyan" /> : null}
        </span>
        <span className="truncate font-mono text-[12px] text-ink">{option.label}</span>
        {option.fps && option.fps >= 50 ? (
          <span className="font-mono text-[9px] text-ink-3">{Math.round(option.fps)}fps</span>
        ) : null}
        {option.hdr ? <Chip tone="amber">HDR</Chip> : null}
        {option.recommended ? (
          <Chip tone="cyan" className="ml-auto">
            Recomendado
          </Chip>
        ) : option.isMax ? (
          <Chip tone="neutral" className="ml-auto">
            Máxima
          </Chip>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 pl-[22px] font-mono text-[9.5px] text-ink-3">
        <span className="truncate">
          {option.codec}
          {option.bitrateKbps ? ` · ${Math.round(option.bitrateKbps)} kbps` : ''}
        </span>
        <span className="shrink-0">{formatBytes(option.sizeBytes)}</span>
      </div>
    </button>
  )
}

function AudioOptionRow({
  option,
  selected,
  onSelect,
}: {
  option: AudioOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex flex-col gap-1 rounded-md border px-2 py-1.5 text-left transition-colors duration-150',
        selected
          ? 'border-cyan/45 bg-cyan/[0.055]'
          : 'border-line bg-bg/40 hover:border-line-strong hover:bg-bg/70',
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            'grid size-3.5 shrink-0 place-items-center rounded-full border',
            selected ? 'border-cyan' : 'border-ink-3/70',
          )}
        >
          {selected ? <span className="size-1.5 rounded-full bg-cyan" /> : null}
        </span>
        <span className="truncate text-[11.5px] text-ink">{option.label}</span>
        {option.recommended ? (
          <Chip tone="cyan" className="ml-auto">
            Mejor
          </Chip>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 pl-[22px] font-mono text-[9.5px] text-ink-3">
        <span className="truncate">{option.detail}</span>
        <span className="shrink-0">{formatBytes(option.sizeBytes)}</span>
      </div>
    </button>
  )
}

export function ResultSkeleton() {
  return (
    <section className="animate-in overflow-hidden rounded-xl border border-line bg-surface/40">
      <div className="flex flex-col gap-3 p-3 sm:flex-row">
        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:w-[228px]">
          <div className="absolute inset-0 shimmer opacity-30" />
        </div>
        <div className="flex flex-1 flex-col gap-2 py-1">
          <div className="h-3 w-32 rounded bg-surface-2" />
          <div className="mt-1 h-4 w-4/5 rounded bg-surface-2" />
          <div className="h-4 w-2/3 rounded bg-surface-2" />
          <div className="mt-auto flex gap-1.5">
            <div className="h-4 w-16 rounded-full bg-surface-2" />
            <div className="h-4 w-20 rounded-full bg-surface-2" />
          </div>
        </div>
      </div>
      <div className="mx-3 h-px bg-line" />
      <div className="grid grid-cols-2 gap-1.5 p-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-[46px] rounded-md border border-line bg-bg/40" />
        ))}
      </div>
    </section>
  )
}
