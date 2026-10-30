import { cn } from '../../lib/cn'

interface ProgressProps {
  value: number
  tone?: 'cyan' | 'blue' | 'green' | 'amber'
  className?: string
  indeterminate?: boolean
  height?: number
}

const tones = {
  cyan: 'bg-cyan',
  blue: 'bg-blue',
  green: 'bg-green',
  amber: 'bg-amber',
}

export function Progress({ value, tone = 'cyan', className, indeterminate, height = 2 }: ProgressProps) {
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-full bg-white/[0.09]', className)}
      style={{ height }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(clamped * 100)}
    >
      {indeterminate ? (
        <div className={cn('absolute inset-y-0 left-0 w-1/3 rounded-full shimmer', tones[tone])} />
      ) : (
        <div
          className={cn('h-full w-full origin-left rounded-full transition-transform duration-300 ease-out', tones[tone])}
          style={{ transform: `scaleX(${clamped})` }}
        />
      )}
    </div>
  )
}
