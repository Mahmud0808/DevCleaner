import { Info, ScanLine, SlidersHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ViewId = 'scanner' | 'settings' | 'about'

const NAV: Array<{ id: ViewId; label: string; icon: LucideIcon }> = [
  { id: 'scanner', label: 'Scanner', icon: ScanLine },
  { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
  { id: 'about', label: 'About', icon: Info }
]

interface SidebarProps {
  view: ViewId
  onChange: (view: ViewId) => void
  reclaimedLabel: string | null
}

export function Sidebar({ view, onChange, reclaimedLabel }: SidebarProps): JSX.Element {
  return (
    <aside className="flex w-[212px] shrink-0 flex-col border-r border-line bg-surface-1">
      <div className="drag-region flex h-12 items-center gap-2.5 px-4">
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-brand">
          <span className="h-[7px] w-[7px] rounded-[2px] bg-brand-fg" />
        </span>
        <p className="text-[13px] font-semibold tracking-[-0.01em] text-content">Dev Cleaner</p>
      </div>

      <nav className="flex flex-col gap-0.5 px-2.5 py-2">
        {NAV.map((entry) => {
          const active = view === entry.id
          const Icon = entry.icon
          return (
            <button
              key={entry.id}
              onClick={() => onChange(entry.id)}
              className={cn(
                'no-drag flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left transition-colors duration-[140ms]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1',
                active
                  ? 'bg-surface-3 text-content'
                  : 'text-content-muted hover:bg-surface-2 hover:text-content'
              )}
            >
              <Icon
                className={cn('h-[15px] w-[15px] shrink-0', active ? 'text-brand' : 'text-content-subtle')}
              />
              <span className="text-[12.5px] font-medium">{entry.label}</span>
            </button>
          )
        })}
      </nav>

      {reclaimedLabel && (
        <div className="mt-auto border-t border-line px-4 py-3.5">
          <p className="text-[11px] text-content-subtle">Freed this session</p>
          <p className="num mt-1 text-[16px] font-semibold text-brand">{reclaimedLabel}</p>
        </div>
      )}
    </aside>
  )
}
