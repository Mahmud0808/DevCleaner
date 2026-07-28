import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent, RefObject } from 'react'
import { AlertTriangle, ChevronRight, Copy, FolderOpen, ShieldOff, SquareCheck } from 'lucide-react'
import type { ScanCategoryGroup, ScanItem, ScanProject } from '@shared/types'
import { CATEGORY_BY_ID, getTarget } from '@shared/rules'
import { Checkbox } from '@/components/ui/Checkbox'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/ContextMenu'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn, formatBytes, formatCount, formatRelativeTime } from '@/lib/utils'

export type CheckState = boolean | 'indeterminate'

const GROUP_HEIGHT = 44
const PROJECT_HEIGHT = 40
const ITEM_HEIGHT = 36
const OVERSCAN_PX = 600

interface TreeViewProps {
  groups: ScanCategoryGroup[]
  selected: Set<string>
  expanded: Set<string>
  revealLabel: string
  scrollParent: RefObject<HTMLElement>
  onToggleExpand: (id: string) => void
  onToggleSelection: (paths: string[], checked: boolean) => void
  onReveal: (path: string) => void
  onCopyPath: (path: string) => void
  onProtect: (path: string) => void
}

type Row =
  | { kind: 'group'; id: string; height: number; first: boolean; group: ScanCategoryGroup }
  | { kind: 'project'; id: string; height: number; project: ScanProject }
  | { kind: 'item'; id: string; height: number; item: ScanItem; share: number }

function baseName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

function stateOf(paths: string[], selected: Set<string>): CheckState {
  if (paths.length === 0) return false
  let checked = 0
  for (const path of paths) if (selected.has(path)) checked++
  if (checked === 0) return false
  if (checked === paths.length) return true
  return 'indeterminate'
}

function selectedSize(items: ScanItem[], selected: Set<string>): number {
  let size = 0
  for (const item of items) if (selected.has(item.path)) size += item.size
  return size
}

function upperBound(offsets: number[], value: number): number {
  let low = 0
  let high = offsets.length - 1
  while (low < high) {
    const mid = (low + high + 1) >> 1
    if (offsets[mid] <= value) low = mid
    else high = mid - 1
  }
  return low
}

export function TreeView({
  groups,
  selected,
  expanded,
  revealLabel,
  scrollParent,
  onToggleExpand,
  onToggleSelection,
  onReveal,
  onCopyPath,
  onProtect
}: TreeViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [range, setRange] = useState({ start: 0, end: 40 })
  const [menuRowId, setMenuRowId] = useState<string | null>(null)

  const { rows, offsets, totalHeight, byId } = useMemo(() => {
    const rows: Row[] = []
    for (const [index, group] of groups.entries()) {
      rows.push({
        kind: 'group',
        id: group.categoryId,
        height: GROUP_HEIGHT,
        first: index === 0,
        group
      })
      if (!expanded.has(group.categoryId)) continue
      for (const project of group.projects) {
        rows.push({ kind: 'project', id: project.id, height: PROJECT_HEIGHT, project })
        if (!expanded.has(project.id)) continue
        for (const item of project.items) {
          rows.push({
            kind: 'item',
            id: item.path,
            height: ITEM_HEIGHT,
            item,
            share: project.size > 0 ? item.size / project.size : 0
          })
        }
      }
    }

    const offsets = new Array<number>(rows.length + 1)
    offsets[0] = 0
    for (let i = 0; i < rows.length; i++) offsets[i + 1] = offsets[i] + rows[i].height

    return {
      rows,
      offsets,
      totalHeight: offsets[rows.length],
      byId: new Map(rows.map((row) => [row.id, row]))
    }
  }, [groups, expanded])

  const measure = useCallback(() => {
    const scroller = scrollParent.current
    const container = containerRef.current
    if (!scroller || !container) return

    const top =
      container.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
    const viewTop = scroller.scrollTop - top - OVERSCAN_PX
    const viewBottom = scroller.scrollTop - top + scroller.clientHeight + OVERSCAN_PX

    const start = upperBound(offsets, Math.max(0, viewTop))
    let end = start
    while (end < rows.length && offsets[end] < viewBottom) end++

    setRange((current) =>
      current.start === start && current.end === end ? current : { start, end }
    )
  }, [offsets, rows.length, scrollParent])

  useEffect(() => {
    measure()
    const scroller = scrollParent.current
    if (!scroller) return

    let queued = false
    const onScroll = (): void => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        measure()
      })
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [measure, scrollParent])

  const onContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const row = (event.target as HTMLElement).closest<HTMLElement>('[data-row-id]')
    if (!row) {
      event.preventDefault()
      setMenuRowId(null)
      return
    }
    setMenuRowId(row.dataset.rowId ?? null)
  }, [])

  if (groups.length === 0) {
    return (
      <p className="py-8 text-[12.5px] text-content-muted">No project or path matches that filter.</p>
    )
  }

  const visible = rows.slice(range.start, range.end)
  const topSpacer = offsets[range.start]
  const bottomSpacer = totalHeight - offsets[Math.min(range.end, rows.length)]
  const menuRow = menuRowId ? byId.get(menuRowId) : undefined

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={containerRef}
          role="tree"
          aria-label="Removable folders"
          onContextMenu={onContextMenu}
          className="overflow-hidden rounded-xl border border-line bg-surface-1"
          style={{ minHeight: totalHeight }}
        >
          {topSpacer > 0 && <div style={{ height: topSpacer }} />}

          {visible.map((row) => {
            if (row.kind === 'group') {
              return (
                <GroupRow
                  key={row.id}
                  group={row.group}
                  first={row.first}
                  open={expanded.has(row.id)}
                  selected={selected}
                  onToggleExpand={onToggleExpand}
                  onToggleSelection={onToggleSelection}
                />
              )
            }
            if (row.kind === 'project') {
              return (
                <ProjectRow
                  key={row.id}
                  project={row.project}
                  open={expanded.has(row.id)}
                  selected={selected}
                  onToggleExpand={onToggleExpand}
                  onToggleSelection={onToggleSelection}
                />
              )
            }
            return (
              <ItemRow
                key={row.id}
                item={row.item}
                share={row.share}
                checked={selected.has(row.item.path)}
                onToggleSelection={onToggleSelection}
                onReveal={onReveal}
              />
            )
          })}

          {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} />}
        </div>
      </ContextMenuTrigger>

      {menuRow && menuRow.kind !== 'group' && (
        <RowMenu
          row={menuRow}
          selected={selected}
          revealLabel={revealLabel}
          onToggleSelection={onToggleSelection}
          onReveal={onReveal}
          onCopyPath={onCopyPath}
          onProtect={onProtect}
        />
      )}
    </ContextMenu>
  )
}

function RowMenu({
  row,
  selected,
  revealLabel,
  onToggleSelection,
  onReveal,
  onCopyPath,
  onProtect
}: {
  row: Extract<Row, { kind: 'project' | 'item' }>
  selected: Set<string>
  revealLabel: string
  onToggleSelection: (paths: string[], checked: boolean) => void
  onReveal: (path: string) => void
  onCopyPath: (path: string) => void
  onProtect: (path: string) => void
}): JSX.Element {
  const isProject = row.kind === 'project'
  const path = isProject ? row.project.path : row.item.path
  const paths = isProject ? row.project.items.map((i) => i.path) : [row.item.path]
  const state = stateOf(paths, selected)
  const projectPath = isProject ? row.project.path : row.item.projectPath

  return (
    <ContextMenuContent>
      <ContextMenuLabel>{path}</ContextMenuLabel>
      <ContextMenuItem onSelect={() => onReveal(path)} icon={<FolderOpen className="h-3.5 w-3.5" />}>
        {revealLabel}
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => onCopyPath(path)} icon={<Copy className="h-3.5 w-3.5" />}>
        Copy path
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onSelect={() => onToggleSelection(paths, state !== true)}
        icon={<SquareCheck className="h-3.5 w-3.5" />}
      >
        {state === true
          ? isProject
            ? 'Uncheck this project'
            : 'Uncheck this folder'
          : isProject
            ? 'Check this project'
            : 'Check this folder'}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onSelect={() => onProtect(path)}
        icon={<ShieldOff className="h-3.5 w-3.5" />}
      >
        {isProject ? 'Never clean this project' : 'Never clean this folder'}
      </ContextMenuItem>
      {!isProject && (
        <ContextMenuItem
          onSelect={() => onProtect(projectPath)}
          icon={<ShieldOff className="h-3.5 w-3.5" />}
        >
          Never clean {baseName(projectPath)}
        </ContextMenuItem>
      )}
    </ContextMenuContent>
  )
}

function GroupRow({
  group,
  first,
  open,
  selected,
  onToggleExpand,
  onToggleSelection
}: {
  group: ScanCategoryGroup
  first: boolean
  open: boolean
  selected: Set<string>
  onToggleExpand: (id: string) => void
  onToggleSelection: (paths: string[], checked: boolean) => void
}): JSX.Element {
  const paths = useMemo(
    () => group.projects.flatMap((p) => p.items.map((i) => i.path)),
    [group.projects]
  )
  const state = stateOf(paths, selected)
  const checkedSize = useMemo(
    () => group.projects.reduce((sum, p) => sum + selectedSize(p.items, selected), 0),
    [group.projects, selected]
  )
  const accent = CATEGORY_BY_ID.get(group.categoryId)?.accent ?? '#7C8592'

  return (
    <div
      role="treeitem"
      aria-level={1}
      aria-expanded={open}
      data-row-id={group.categoryId}
      id={`group-${group.categoryId}`}
      onClick={() => onToggleExpand(group.categoryId)}
      className={cn(
        'flex h-11 cursor-pointer items-center gap-3 px-3.5 transition-colors duration-[140ms] hover:bg-surface-2',
        !first && 'border-t border-line'
      )}
    >
      <Checkbox
        checked={state}
        onCheckedChange={(value) => onToggleSelection(paths, value)}
        aria-label={`Check every ${group.label} folder`}
      />
      <ChevronRight
        className={cn(
          'h-3.5 w-3.5 shrink-0 text-content-subtle transition-transform duration-[140ms]',
          open && 'rotate-90'
        )}
      />
      <span className="h-[9px] w-[9px] shrink-0 rounded-[2px]" style={{ backgroundColor: accent }} />
      <span className="text-[13px] font-semibold text-content">{group.label}</span>
      <span className="text-[11.5px] text-content-subtle">
        {formatCount(group.projects.length)} {group.projects.length === 1 ? 'project' : 'projects'}
      </span>
      <SizeCell total={group.size} checked={checkedSize} className="ml-auto" bold />
    </div>
  )
}

function ProjectRow({
  project,
  open,
  selected,
  onToggleExpand,
  onToggleSelection
}: {
  project: ScanProject
  open: boolean
  selected: Set<string>
  onToggleExpand: (id: string) => void
  onToggleSelection: (paths: string[], checked: boolean) => void
}): JSX.Element {
  const paths = useMemo(() => project.items.map((i) => i.path), [project.items])
  const state = stateOf(paths, selected)
  const checkedSize = selectedSize(project.items, selected)

  return (
    <div
      role="treeitem"
      aria-level={2}
      aria-expanded={open}
      data-row-id={project.id}
      onClick={() => onToggleExpand(project.id)}
      className="flex h-10 cursor-pointer items-center gap-3 border-t border-line/70 pl-8 pr-3.5 transition-colors duration-[140ms] hover:bg-surface-2"
    >
      <Checkbox
        checked={state}
        onCheckedChange={(value) => onToggleSelection(paths, value)}
        aria-label={`Check everything in ${project.name}`}
      />
      <ChevronRight
        className={cn(
          'h-3 w-3 shrink-0 text-content-subtle transition-transform duration-[140ms]',
          open && 'rotate-90'
        )}
      />
      <span className="shrink-0 text-[12.5px] font-medium text-content">{project.name}</span>
      <span
        title={project.path}
        className="min-w-0 flex-1 truncate font-mono text-[11px] text-content-subtle"
      >
        {project.relativePath}
      </span>
      <span className="num shrink-0 text-[11px] text-content-subtle">{project.items.length}</span>
      <SizeCell total={project.size} checked={checkedSize} />
    </div>
  )
}

function ItemRow({
  item,
  share,
  checked,
  onToggleSelection,
  onReveal
}: {
  item: ScanItem
  share: number
  checked: boolean
  onToggleSelection: (paths: string[], checked: boolean) => void
  onReveal: (path: string) => void
}): JSX.Element {
  const target = getTarget(item.categoryId, item.targetId)

  return (
    <div
      role="treeitem"
      aria-level={3}
      data-row-id={item.path}
      title={item.path}
      onClick={() => onToggleSelection([item.path], !checked)}
      onDoubleClick={() => onReveal(item.path)}
      className="flex h-9 cursor-pointer items-center gap-3 border-t border-line/40 pl-[3.25rem] pr-3.5 transition-colors duration-[140ms] hover:bg-surface-2"
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onToggleSelection([item.path], value)}
        aria-label={`Check ${item.path}`}
      />
      <span
        className={cn(
          'shrink-0 font-mono text-[12px]',
          checked ? 'text-content' : 'text-content-muted'
        )}
      >
        {item.name}
      </span>
      {target?.caution && (
        <Tooltip content={target.caution}>
          <AlertTriangle className="h-3 w-3 shrink-0 text-warn" />
        </Tooltip>
      )}
      <span className="min-w-0 flex-1" />
      <span className="num hidden shrink-0 text-[11px] text-content-subtle sm:inline">
        {item.kind === 'dir' ? `${formatCount(item.fileCount)} files` : 'file'}
      </span>
      <span className="hidden shrink-0 text-[11px] text-content-subtle md:inline">
        {formatRelativeTime(item.modifiedAt)}
      </span>
      <span className="h-[3px] w-10 shrink-0 overflow-hidden rounded-full bg-surface-3">
        <span
          className={cn('block h-full rounded-full', checked ? 'bg-brand' : 'bg-line-strong')}
          style={{ width: `${Math.max(3, share * 100)}%` }}
        />
      </span>
      <SizeCell total={item.size} checked={checked ? item.size : 0} />
    </div>
  )
}

function SizeCell({
  total,
  checked,
  bold,
  className
}: {
  total: number
  checked: number
  bold?: boolean
  className?: string
}): JSX.Element {
  const off = checked === 0
  const partial = checked > 0 && checked < total
  return (
    <span className={cn('w-[124px] shrink-0 text-right', className)}>
      <span
        className={cn(
          'num text-[12px]',
          bold && 'text-[12.5px] font-semibold',
          off ? 'text-content-subtle line-through' : 'text-content'
        )}
      >
        {formatBytes(off ? total : checked)}
      </span>
      {partial && (
        <span className="num ml-1.5 text-[10.5px] text-content-subtle">/ {formatBytes(total)}</span>
      )}
    </span>
  )
}
