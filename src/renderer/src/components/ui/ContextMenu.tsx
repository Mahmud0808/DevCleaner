import type { ReactNode } from 'react'
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu'
import { cn } from '@/lib/utils'

export const ContextMenu = ContextMenuPrimitive.Root
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger

export function ContextMenuContent({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        collisionPadding={8}
        className="z-50 min-w-[220px] overflow-hidden rounded-lg bg-surface-2 p-1 shadow-overlay data-[state=open]:animate-fade"
      >
        {children}
      </ContextMenuPrimitive.Content>
    </ContextMenuPrimitive.Portal>
  )
}

export function ContextMenuItem({
  onSelect,
  icon,
  danger,
  children
}: {
  onSelect: () => void
  icon?: ReactNode
  danger?: boolean
  children: ReactNode
}): JSX.Element {
  return (
    <ContextMenuPrimitive.Item
      onSelect={onSelect}
      className={cn(
        'flex cursor-default select-none items-center gap-2.5 rounded-md px-2 py-[6px] text-[12.5px] outline-none',
        'data-[highlighted]:bg-surface-3',
        danger ? 'text-danger' : 'text-content'
      )}
    >
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-content-subtle">
        {icon}
      </span>
      {children}
    </ContextMenuPrimitive.Item>
  )
}

export function ContextMenuLabel({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ContextMenuPrimitive.Label className="truncate px-2 py-1.5 font-mono text-[11px] text-content-subtle">
      {children}
    </ContextMenuPrimitive.Label>
  )
}

export function ContextMenuSeparator(): JSX.Element {
  return <ContextMenuPrimitive.Separator className="my-1 h-px bg-line" />
}
