import { cn } from '@/lib/utils'

interface ProgressProps {
  value?: number
  indeterminate?: boolean
  className?: string
}

export function Progress({ value = 0, indeterminate, className }: ProgressProps): JSX.Element {
  return (
    <div className={cn('relative h-[3px] w-full overflow-hidden rounded-full bg-surface-3', className)}>
      {indeterminate ? (
        <div
          key="indeterminate"
          className="absolute inset-y-0 left-0 w-1/4 animate-sweep rounded-full bg-brand"
        />
      ) : (
        <div
          key="determinate"
          className="h-full rounded-full bg-brand transition-[width] duration-200"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      )}
    </div>
  )
}
