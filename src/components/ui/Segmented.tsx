import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  count?: number
  disabled?: boolean
}

interface SegmentedProps<T extends string> {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
}

export function Segmented<T extends string>({ value, options, onChange, label, className }: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('inline-flex items-center gap-0.5 rounded-md border border-line bg-bg/70 p-0.5', className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-6 items-center gap-1.5 rounded-[4px] px-2.5 text-[11.5px] transition-colors duration-150',
              'disabled:pointer-events-none disabled:opacity-40',
              active
                ? 'bg-surface-2 text-ink shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {option.icon ? <span className="grid place-items-center text-current">{option.icon}</span> : null}
            <span>{option.label}</span>
            {typeof option.count === 'number' ? (
              <span className="font-mono text-[10px] text-ink-3">{option.count}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
