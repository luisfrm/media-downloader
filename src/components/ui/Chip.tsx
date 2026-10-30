import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Tone = 'neutral' | 'cyan' | 'blue' | 'green' | 'amber' | 'rose' | 'outline'

const tones: Record<Tone, string> = {
  neutral: 'bg-white/[0.055] text-ink-2 border border-white/[0.06]',
  cyan: 'bg-cyan/[0.11] text-cyan border border-cyan/20',
  blue: 'bg-blue/[0.16] text-[#9db9ff] border border-blue/30',
  green: 'bg-green/[0.11] text-green border border-green/25',
  amber: 'bg-amber/[0.11] text-amber border border-amber/25',
  rose: 'bg-rose/[0.11] text-rose border border-rose/25',
  outline: 'bg-transparent text-ink-3 border border-line-strong',
}

interface ChipProps {
  children: ReactNode
  tone?: Tone
  mono?: boolean
  className?: string
  title?: string
}

export function Chip({ children, tone = 'neutral', mono = true, className, title }: ChipProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-[18px] max-w-full items-center gap-1 truncate rounded-full px-1.5 text-[10px] leading-none whitespace-nowrap',
        mono && 'font-mono',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
