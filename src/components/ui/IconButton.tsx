import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface IconButtonProps extends ComponentProps<'button'> {
  label: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'default' | 'danger' | 'accent'
  children: ReactNode
}

const sizes = {
  sm: 'size-7 rounded-[5px]',
  md: 'size-8 rounded-md',
  lg: 'size-9 rounded-md',
}

const tones = {
  default: 'text-ink-2 hover:bg-white/[0.06] hover:text-ink',
  danger: 'text-ink-3 hover:bg-rose/12 hover:text-rose',
  accent: 'text-cyan hover:bg-cyan/10',
}

export function IconButton({
  label,
  size = 'md',
  tone = 'default',
  className,
  children,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-grid place-items-center transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40',
        sizes[size],
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
