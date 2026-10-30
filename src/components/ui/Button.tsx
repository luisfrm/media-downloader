import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'accent' | 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  accent:
    'bg-cyan text-[#062430] font-semibold hover:bg-cyan-bright active:bg-cyan shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_6px_20px_-10px_rgba(34,211,238,0.7)]',
  primary:
    'bg-blue text-white font-medium hover:bg-blue-hover active:bg-blue border border-white/10 shadow-[0_6px_18px_-10px_rgba(37,99,235,0.9)]',
  secondary:
    'bg-surface-2 text-ink border border-line-strong hover:bg-elevated hover:border-line-strong active:bg-surface-2',
  ghost: 'bg-transparent text-ink-2 hover:bg-white/[0.05] hover:text-ink active:bg-white/[0.07]',
  danger:
    'bg-rose/10 text-rose border border-rose/25 hover:bg-rose/15 hover:border-rose/40 active:bg-rose/20',
}

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[11.5px] gap-1.5 rounded-[5px]',
  md: 'h-8 px-3 text-[12px] gap-1.5 rounded-md',
  lg: 'h-10 px-4 text-[13px] gap-2 rounded-md',
}

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant
  size?: Size
  block?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  block,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150',
        'disabled:pointer-events-none disabled:opacity-45',
        'active:translate-y-px',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...props}
    />
  )
}
