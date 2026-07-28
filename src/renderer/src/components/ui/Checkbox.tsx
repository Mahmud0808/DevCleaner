import { forwardRef } from 'react'
import type { MouseEvent } from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CheckedState = boolean | 'indeterminate'

export interface CheckboxProps {
  checked: CheckedState
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { checked, onCheckedChange, disabled, className, ...props },
  ref
) {
  const isOn = checked === true
  const isMixed = checked === 'indeterminate'

  const onClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation()
    onCheckedChange(!isOn)
  }

  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={isMixed ? 'mixed' : isOn}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[4px] border',
        'transition-colors duration-[140ms]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1',
        'disabled:cursor-not-allowed disabled:opacity-40',
        isOn || isMixed
          ? 'border-brand bg-brand text-brand-fg'
          : 'border-line-strong bg-transparent hover:border-content-subtle',
        className
      )}
      {...props}
    >
      {isMixed ? (
        <Minus className="h-2.5 w-2.5" strokeWidth={4} />
      ) : isOn ? (
        <Check className="h-2.5 w-2.5" strokeWidth={4} />
      ) : null}
    </button>
  )
})
