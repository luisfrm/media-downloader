import { ClipboardPaste, FolderClosed, Link2, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import type { RefObject } from 'react'
import { BrandIcon } from '../../components/BrandIcon'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Select } from '../../components/ui/Select'
import { Toggle } from '../../components/ui/Toggle'
import { PLATFORMS } from '../../lib/platform'
import { cn } from '../../lib/cn'
import type { Platform, Settings } from '../../lib/types'
import { truncateMiddle } from '../../lib/format'

interface CommandBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onPaste: () => void
  loading: boolean
  platform: Platform
  error: string | null
  inputRef: RefObject<HTMLInputElement | null>
  preset: Settings['preferredQuality']
  onPreset: (value: Settings['preferredQuality']) => void
  folder: string
  onPickFolder: () => void
  clipboardWatch: boolean
  onClipboardWatch: (value: boolean) => void
}

const presets: Array<{ value: Settings['preferredQuality']; label: string; hint: string }> = [
  { value: 'best', label: 'Mejor', hint: 'Máxima resolución disponible' },
  { value: '1080', label: '1080p', hint: 'Full HD · buen equilibrio' },
  { value: '720', label: '720p', hint: 'HD liviano' },
  { value: 'audio', label: 'Solo audio', hint: 'Extrae la mejor pista' },
]

export function CommandBar({
  value,
  onChange,
  onSubmit,
  onPaste,
  loading,
  platform,
  error,
  inputRef,
  preset,
  onPreset,
  folder,
  onPickFolder,
  clipboardWatch,
  onClipboardWatch,
}: CommandBarProps) {
  const meta = PLATFORMS[platform]
  const detected = Boolean(value.trim())
  const folderName = folder.split(/[\\/]/).filter(Boolean).pop() ?? 'Descargas'

  return (
    <div className="rounded-[10px] border border-line bg-surface/55 p-1.5 shadow-[0_24px_50px_-32px_rgba(0,0,0,0.95)]">
      <div
        className={cn(
          'flex items-center gap-1 rounded-lg border border-line/80 bg-bg/70 p-1 transition-[border-color,box-shadow] duration-200',
          'focus-within:border-cyan/40 focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.07)]',
          error && 'border-rose/40',
        )}
      >
        <div className="flex h-9 shrink-0 items-center">
          <div
            key={detected ? platform : 'empty'}
            className={cn(
              'animate-in flex items-center gap-1.5 rounded-md px-2',
              detected && 'bg-white/[0.04]',
            )}
          >
            {detected ? (
              <>
                <BrandIcon platform={platform} size={15} className="shrink-0" />
                <span className="hidden text-[11px] font-medium text-ink-2 sm:inline">{meta.name}</span>
              </>
            ) : (
              <>
                <Link2 className="size-3.5 text-ink-3" strokeWidth={1.8} />
                <span className="font-mono text-[9.5px] tracking-[0.08em] text-ink-3">AUTO</span>
              </>
            )}
          </div>
        </div>

        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onSubmit()
            }
          }}
          type="url"
          spellCheck={false}
          autoComplete="off"
          aria-label="Enlace de video"
          placeholder={
            platform !== 'other'
              ? `Pegá un enlace de ${meta.name}…`
              : 'Pegá un enlace de YouTube, X, TikTok, Instagram o Facebook…'
          }
          className="h-9 min-w-0 flex-1 bg-transparent px-1 font-mono text-[12.5px] text-ink placeholder:font-sans placeholder:text-[12.5px] placeholder:text-ink-3/80"
        />

        <IconButton label="Pegar desde el portapapeles" size="md" onClick={onPaste} className="mr-0.5">
          <ClipboardPaste className="size-3.5" strokeWidth={1.8} />
        </IconButton>

        <Button
          variant="accent"
          size="lg"
          onClick={onSubmit}
          disabled={loading}
          className="h-9 px-3.5"
          aria-label="Analizar enlace"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" strokeWidth={2.2} />}
          <span>{loading ? 'Leyendo…' : 'Analizar'}</span>
        </Button>
      </div>

      {error ? (
        <div className="mt-1.5 flex items-start gap-1.5 px-1.5 text-[11px] text-rose/90" role="alert">
          <AlertCircle className="mt-px size-3 shrink-0" strokeWidth={2} />
          <span className="min-w-0">{error}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1.5 pb-0.5 pt-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.1em] text-ink-3">Calidad</span>
            <Select
              value={preset}
              options={presets}
              onChange={(next) => onPreset(next as Settings['preferredQuality'])}
              label="Calidad preferida"
              className="w-[124px]"
            />
          </div>

          <span className="h-3.5 w-px bg-line" />

          <button
            type="button"
            onClick={onPickFolder}
            title={`Cambiar carpeta · ${folder}`}
            className="group flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-ink-3 transition-colors hover:text-ink-2"
          >
            <FolderClosed className="size-3 shrink-0" strokeWidth={1.8} />
            <span className="max-w-[150px] truncate font-mono text-[10.5px]">{folderName}</span>
            <span className="hidden text-[10px] text-cyan/70 group-hover:text-cyan sm:inline">Cambiar</span>
          </button>
        </div>

        <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-ink-3">
          <Toggle
            checked={clipboardWatch}
            onChange={onClipboardWatch}
            label="Detectar enlaces copiados al enfocar la ventana"
          />
          <span className="hidden sm:inline">Detectar al copiar</span>
          <span className="kbd ml-1 hidden lg:inline">Ctrl V</span>
        </label>
      </div>

      {folder ? (
        <span className="sr-only">{truncateMiddle(folder, 80)}</span>
      ) : null}
    </div>
  )
}
