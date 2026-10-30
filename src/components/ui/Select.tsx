import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface SelectOption<T extends string> {
  value: T
  label: string
  hint?: string
  disabled?: boolean
}

interface SelectProps<T extends string> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
  menuClassName?: string
  prefix?: ReactNode
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
  menuClassName,
  prefix,
  disabled,
  size = 'sm',
}: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)))
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (open) {
      listRef.current?.focus()
      const index = Math.max(0, options.findIndex((option) => option.value === value))
      setHighlight(index)
    }
  }, [open, options, value])

  const commit = (option: SelectOption<T>) => {
    if (option.disabled) return
    onChange(option.value)
    setOpen(false)
    buttonRef.current?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        setOpen(true)
      }
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      let next = highlight
      for (let step = 0; step < options.length; step += 1) {
        next = (next + delta + options.length) % options.length
        if (!options[next]?.disabled) break
      }
      setHighlight(next)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const option = options[highlight]
      if (option) commit(option)
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)} onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'inline-flex w-full items-center justify-between gap-2 rounded-[5px] border border-line bg-bg/60 text-ink transition-colors',
          'hover:border-line-strong hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-45',
          size === 'sm' ? 'h-7 px-2 text-[11.5px]' : 'h-8 px-2.5 text-[12px]',
          open && 'border-cyan/45 bg-surface-2',
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {prefix}
          <span className={cn('truncate', size === 'sm' ? 'font-mono' : '')}>{selected?.label ?? '—'}</span>
        </span>
        <ChevronDown
          className={cn('size-3.5 shrink-0 text-ink-3 transition-transform duration-150', open && 'rotate-180')}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`select-option-${highlight}`}
          className={cn(
            'absolute left-0 top-[calc(100%+4px)] z-50 min-w-full max-w-[320px] overflow-hidden rounded-lg border border-line-strong bg-elevated p-1 outline-none',
            'shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)] animate-in',
            menuClassName,
          )}
        >
          <div className="max-h-64 overflow-y-auto">
            {options.map((option, index) => {
              const active = option.value === value
              return (
                <button
                  key={option.value}
                  id={`select-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={option.disabled}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => commit(option)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-[5px] px-2 py-1.5 text-left transition-colors',
                    'disabled:pointer-events-none disabled:opacity-40',
                    index === highlight ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]',
                  )}
                >
                  <span className="mt-0.5 grid size-3.5 shrink-0 place-items-center">
                    {active ? <Check className="size-3.5 text-cyan" strokeWidth={2.5} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-[12px]', active ? 'text-ink' : 'text-ink-2')}>
                      {option.label}
                    </span>
                    {option.hint ? (
                      <span className="block truncate text-[10.5px] text-ink-3">{option.hint}</span>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
