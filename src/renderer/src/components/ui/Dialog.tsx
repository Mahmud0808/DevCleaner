import type { ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  children
}: {
  className?: string
  children: ReactNode
}): JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-fade" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[min(540px,calc(100vw-4rem))] -translate-x-1/2 -translate-y-1/2',
          'rounded-xl bg-surface-1 p-5 shadow-overlay',
          'data-[state=open]:animate-dialog-in focus:outline-none',
          className
        )}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogTitle({ children }: { children: ReactNode }): JSX.Element {
  return (
    <DialogPrimitive.Title className="text-[15px] font-semibold tracking-tight text-content">
      {children}
    </DialogPrimitive.Title>
  )
}

export function DialogDescription({ children }: { children: ReactNode }): JSX.Element {
  return (
    <DialogPrimitive.Description className="mt-1 text-[12.5px] leading-relaxed text-content-muted">
      {children}
    </DialogPrimitive.Description>
  )
}
