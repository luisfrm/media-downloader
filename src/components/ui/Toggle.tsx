import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  id?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, id, disabled }: ToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-[18px] w-[32px] shrink-0 items-center rounded-full border transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-40',
        checked ? 'border-cyan/40 bg-cyan/25' : 'border-line-strong bg-white/[0.06]',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block size-3 rounded-full transition-transform duration-150 ease-out',
          checked ? 'translate-x-[15px] bg-cyan' : 'translate-x-[2px] bg-ink-3',
        )}
      />
    </button>
  )
}

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  className?: string
  disabled?: boolean
}

export function Checkbox({ checked, onChange, label, className, disabled }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'grid size-[15px] shrink-0 place-items-center rounded-[4px] border transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-40',
        checked ? 'border-cyan/60 bg-cyan/20 text-cyan' : 'border-line-strong bg-bg/60 hover:border-ink-3',
        className,
      )}
    >
      {checked ? <Check className="size-2.5" strokeWidth={3} /> : null}
    </button>
  )
}
