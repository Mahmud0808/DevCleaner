import { useState } from 'react'
import { CATEGORY_BY_ID } from '@shared/rules'
import type { ScanCategoryGroup } from '@shared/types'
import { cn, formatBytes } from '@/lib/utils'

export interface BandSegment {
  categoryId: string
  label: string
  color: string
  total: number
  checked: number
}

export function buildSegments(
  groups: ScanCategoryGroup[],
  selected: Set<string>
): BandSegment[] {
  return groups
    .map((group) => {
      let checked = 0
      for (const project of group.projects) {
        for (const item of project.items) if (selected.has(item.path)) checked += item.size
      }
      return {
        categoryId: group.categoryId,
        label: group.label,
        color: CATEGORY_BY_ID.get(group.categoryId)?.accent ?? '#7C8592',
        total: group.size,
        checked
      }
    })
    .filter((segment) => segment.total > 0)
    .sort((a, b) => b.total - a.total)
}

interface CapacityBandProps {
  segments: BandSegment[]
  onSelect?: (categoryId: string) => void
}

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgb(${r} ${g} ${b} / ${alpha})`
}

export function CapacityBand({ segments, onSelect }: CapacityBandProps): JSX.Element | null {
  const [hovered, setHovered] = useState<string | null>(null)
  const total = segments.reduce((sum, s) => sum + s.total, 0)
  if (total === 0) return null

  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden">
        {segments.map((segment) => {
          const dim = hovered !== null && hovered !== segment.categoryId
          const share = segment.total / total
          return (
            <div
              key={segment.categoryId}
              className="h-full min-w-[3px] overflow-hidden rounded-[3px] transition-[flex-grow,background-color] duration-[320ms] ease-instrument"
              style={{
                flexGrow: share,
                flexBasis: 0,
                backgroundColor: withAlpha(segment.color, dim ? 0.14 : 0.24)
              }}
              onMouseEnter={() => setHovered(segment.categoryId)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="h-full rounded-[3px] transition-[width,background-color] duration-[320ms] ease-instrument"
                style={{
                  width: `${(segment.checked / segment.total) * 100}%`,
                  backgroundColor: dim ? withAlpha(segment.color, 0.5) : segment.color
                }}
              />
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((segment) => (
          <button
            key={segment.categoryId}
            onMouseEnter={() => setHovered(segment.categoryId)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelect?.(segment.categoryId)}
            className={cn(
              'group flex items-baseline gap-2 text-left transition-opacity duration-[140ms]',
              hovered !== null && hovered !== segment.categoryId && 'opacity-45'
            )}
          >
            <span
              className="translate-y-[-1px] h-[7px] w-[7px] shrink-0 rounded-[2px]"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-[12px] text-content-muted group-hover:text-content">
              {segment.label}
            </span>
            <span className="num text-[12px] text-content">{formatBytes(segment.total)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
