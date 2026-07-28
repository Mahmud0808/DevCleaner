import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-brand-fg hover:brightness-[1.08] active:brightness-95',
  secondary: 'bg-surface-3 text-content hover:bg-line-strong/60',
  ghost: 'text-content-muted hover:bg-surface-2 hover:text-content',
  outline: 'border border-line bg-surface-1 text-content hover:border-line-strong hover:bg-surface-2',
  danger: 'bg-danger text-white hover:brightness-[1.08] active:brightness-95'
}

const SIZES: Record<Size, string> = {
  sm: 'h-7 gap-1.5 rounded-[7px] px-2.5 text-[12px]',
  md: 'h-8 gap-2 rounded-lg px-3 text-[12.5px]',
  lg: 'h-9 gap-2 rounded-lg px-4 text-[13px]',
  icon: 'h-7 w-7 rounded-[7px]'
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', loading, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'no-drag inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-[background-color,border-color,color,filter] duration-[140ms]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
})
