import { BrandIcon } from '../../components/BrandIcon'
import { PLATFORMS, PLATFORM_ORDER } from '../../lib/platform'
import { cn } from '../../lib/cn'
import type { Platform } from '../../lib/types'

interface PlatformStripProps {
  active: Platform | null
  onSelect: (platform: Platform) => void
}

export function PlatformStrip({ active, onSelect }: PlatformStripProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
      {PLATFORM_ORDER.map((platform) => {
        const meta = PLATFORMS[platform]
        const isActive = active === platform
        return (
          <button
            key={platform}
            type="button"
            onClick={() => onSelect(platform)}
            aria-pressed={isActive}
            className={cn(
              'group relative flex items-center gap-2.5 overflow-hidden rounded-lg border px-2.5 py-2 text-left transition-[background-color,border-color,transform] duration-150',
              'hover:-translate-y-px active:translate-y-0',
              isActive
                ? 'border-cyan/35 bg-cyan/[0.045]'
                : 'border-line bg-surface/35 hover:border-line-strong hover:bg-surface/70',
            )}
          >
            <span
              className="grid size-7 shrink-0 place-items-center rounded-md border transition-colors duration-150"
              style={{
                color: meta.tint,
                backgroundColor: `${meta.tint}14`,
                borderColor: `${meta.tint}22`,
              }}
            >
              <BrandIcon platform={platform} size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-ink">{meta.name}</span>
              <span className="block truncate font-mono text-[9.5px] text-ink-3">{meta.capabilities}</span>
            </span>
            {isActive ? <span className="size-1.5 shrink-0 rounded-full bg-cyan" /> : null}
          </button>
        )
      })}
    </div>
  )
}
