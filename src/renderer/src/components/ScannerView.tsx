import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderOpen,
  RefreshCw,
  Search,
  Trash2,
  X
} from 'lucide-react'
import type {
  DeleteProgress,
  DeleteResult,
  ScanCategoryGroup,
  ScanItem,
  ScanProgress,
  ScanResult,
  Settings
} from '@shared/types'
import { CATEGORIES, CATEGORY_BY_ID } from '@shared/rules'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Tooltip } from '@/components/ui/Tooltip'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/Dialog'
import { TreeView } from '@/components/TreeView'
import { CapacityBand, buildSegments } from '@/components/CapacityBand'
import { cn, formatBytes, formatCount, formatDuration, isUnder, splitBytes } from '@/lib/utils'

type Status = 'idle' | 'scanning' | 'ready' | 'deleting' | 'error'

interface ScannerViewProps {
  settings: Settings | null
  platform: NodeJS.Platform
  onReclaimed: (bytes: number) => void
  onOpenSettings: () => void
  onUpdateSettings: (patch: Partial<Settings>) => Promise<void>
}

function revealLabelFor(platform: NodeJS.Platform): string {
  if (platform === 'darwin') return 'Reveal in Finder'
  if (platform === 'win32') return 'Show in Explorer'
  return 'Show in file manager'
}

export function ScannerView({
  settings,
  platform,
  onReclaimed,
  onOpenSettings,
  onUpdateSettings
}: ScannerViewProps): JSX.Element {
  const [root, setRoot] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [deleteProgress, setDeleteProgress] = useState<DeleteProgress | null>(null)
  const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [scanKey, setScanKey] = useState(0)
  const [cleaned, setCleaned] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (root === null && settings?.lastDirectory) setRoot(settings.lastDirectory)
  }, [settings?.lastDirectory, root])

  useEffect(() => window.api.onScanProgress(setProgress), [])
  useEffect(() => window.api.onDeleteProgress(setDeleteProgress), [])

  const chooseFolder = useCallback(async () => {
    const picked = await window.api.selectDirectory()
    if (picked) {
      setRoot(picked)
      setResult(null)
      setDeleteResult(null)
      setCleaned(false)
      setStatus('idle')
    }
  }, [])

  const runScan = useCallback(async (target: string) => {
    setStatus('scanning')
    setError(null)
    setDeleteResult(null)
    setCleaned(false)
    setProgress(null)
    setResult(null)
    try {
      const scan = await window.api.scanDirectory(target)
      setResult(scan)
      setSelected(
        new Set(scan.groups.flatMap((g) => g.projects.flatMap((p) => p.items.map((i) => i.path))))
      )
      setExpanded(new Set(scan.groups.slice(0, 2).map((g) => g.categoryId)))
      setScanKey((k) => k + 1)
      setStatus('ready')
      scrollRef.current?.scrollTo({ top: 0 })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setStatus('error')
    }
  }, [])

  const allItems = useMemo(
    () => result?.groups.flatMap((g) => g.projects.flatMap((p) => p.items)) ?? [],
    [result]
  )

  const sizeByPath = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of allItems) map[item.path] = item.size
    return map
  }, [allItems])

  const fileCountByPath = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of allItems) map[item.path] = item.fileCount
    return map
  }, [allItems])

  const selectedItems = useMemo(
    () => allItems.filter((i) => selected.has(i.path)),
    [allItems, selected]
  )
  const selectedPaths = useMemo(() => selectedItems.map((i) => i.path), [selectedItems])
  const selectedBytes = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.size, 0),
    [selectedItems]
  )

  const segments = useMemo(
    () => (result ? buildSegments(result.groups, selected) : []),
    [result, selected]
  )

  const filteredGroups: ScanCategoryGroup[] = useMemo(() => {
    if (!result) return []
    const needle = query.trim().toLowerCase()
    if (!needle) return result.groups
    return result.groups
      .map((group) => {
        const projects = group.projects
          .map((project) => {
            const projectHit =
              project.name.toLowerCase().includes(needle) ||
              project.relativePath.toLowerCase().includes(needle) ||
              group.label.toLowerCase().includes(needle)
            const items = projectHit
              ? project.items
              : project.items.filter((item) => item.path.toLowerCase().includes(needle))
            return items.length ? { ...project, items } : null
          })
          .filter((p): p is NonNullable<typeof p> => p !== null)
        return projects.length ? { ...group, projects } : null
      })
      .filter((g): g is ScanCategoryGroup => g !== null)
  }, [result, query])

  const toggleExpand = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelection = useCallback((paths: string[], checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current)
      for (const path of paths) {
        if (checked) next.add(path)
        else next.delete(path)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    if (!result) return
    const ids = new Set<string>()
    for (const group of result.groups) {
      ids.add(group.categoryId)
      for (const project of group.projects) ids.add(project.id)
    }
    setExpanded(ids)
  }, [result])

  const collapseAll = useCallback(() => setExpanded(new Set()), [])

  const confirmDelete = useCallback(async () => {
    if (!result || selectedPaths.length === 0) return
    setStatus('deleting')
    setDeleteProgress({
      current: '',
      currentItem: '',
      completed: 0,
      total: selectedPaths.length,
      reclaimedBytes: 0,
      filesDeleted: 0,
      filesTotal: selectedItems.reduce((sum, item) => sum + item.fileCount, 0)
    })
    try {
      const outcome = await window.api.deleteItems({
        root: result.root,
        paths: selectedPaths,
        sizes: sizeByPath,
        fileCounts: fileCountByPath
      })
      setDeleteResult(outcome)
      if (outcome.deleted.length > 0) setCleaned(true)
      onReclaimed(outcome.reclaimedBytes)

      const removed = new Set(outcome.deleted)
      setResult((current) => (current ? pruneResult(current, (p) => removed.has(p)) : current))
      setSelected((current) => {
        const next = new Set(current)
        for (const path of removed) next.delete(path)
        return next
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setStatus('ready')
      setDeleteProgress(null)
      setConfirmOpen(false)
    }
  }, [result, selectedPaths, selectedItems, sizeByPath, fileCountByPath, onReclaimed])

  const protectPath = useCallback(
    (path: string) => {
      const current = settings?.protectedPaths ?? []
      if (!current.includes(path)) {
        void onUpdateSettings({ protectedPaths: [...current, path] })
      }
      setResult((existing) => (existing ? pruneResult(existing, (p) => isUnder(p, path)) : existing))
      setSelected((existing) => {
        const next = new Set(existing)
        for (const value of next) if (isUnder(value, path)) next.delete(value)
        return next
      })
    },
    [settings?.protectedPaths, onUpdateSettings]
  )

  const clearResults = useCallback(() => {
    setResult(null)
    setDeleteResult(null)
    setCleaned(false)
    setError(null)
    setQuery('')
    setStatus('idle')
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || confirmOpen) return
      if (status === 'scanning') void window.api.cancelScan()
      else if (result) clearResults()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmOpen, status, result, clearResults])

  const startDelete = useCallback(() => {
    if (settings?.confirmBeforeDelete === false) void confirmDelete()
    else setConfirmOpen(true)
  }, [settings?.confirmBeforeDelete, confirmDelete])

  const busy = status === 'scanning' || status === 'deleting'
  const trash = settings?.useTrash === true
  const scanning = status === 'scanning'
  const measuring = scanning && progress?.phase === 'measuring'
  const hasResults = result !== null && result.totalItems > 0
  const figure = splitBytes(scanning ? (progress?.bytesFound ?? 0) : selectedBytes)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header
        className="drag-region flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface-1 pl-4"
        style={{ paddingRight: platform === 'darwin' ? 16 : 146 }}
      >
        {scanning || result ? (
          <>
            {result && !busy && (
              <Tooltip content="Back to start (Esc)">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={clearResults}
                  aria-label="Back to start"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
            )}
            <PathField root={root} onClick={chooseFolder} disabled={busy} />
            {scanning ? (
              <Button size="sm" variant="outline" onClick={() => void window.api.cancelScan()}>
                <X className="h-3.5 w-3.5" />
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => root && runScan(root)}
                disabled={!root || busy}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Rescan
              </Button>
            )}
          </>
        ) : (
          <h1 className="flex-1 text-[13px] font-semibold text-content">Scanner</h1>
        )}
      </header>

      <div ref={scrollRef} className="scroller min-h-0 flex-1">
        <div className="px-6 py-5">
          {status === 'idle' && !result && (
            <StartState
              root={root}
              settings={settings}
              onBrowse={chooseFolder}
              onScan={() => root && runScan(root)}
              onOpenSettings={onOpenSettings}
            />
          )}

          {status === 'error' && error && (
            <div className="rounded-xl border border-danger/45 bg-danger/[0.07] p-4">
              <p className="flex items-center gap-2 text-[13px] font-medium text-content">
                <AlertTriangle className="h-4 w-4 text-danger" />
                The scan stopped early
              </p>
              <p className="selectable mt-1.5 break-words pl-6 font-mono text-[11.5px] text-content-muted">
                {error}
              </p>
            </div>
          )}

          {deleteResult && (
            <DeleteSummary result={deleteResult} onDismiss={() => setDeleteResult(null)} />
          )}

          {(scanning || hasResults) && (
            <section className="rounded-xl border border-line bg-surface-1 px-5 pb-5 pt-4">
              <div className="flex items-end justify-between gap-6">
                <div>
                  <p className="num text-[34px] font-semibold leading-none tracking-[-0.02em] text-brand">
                    {figure.value}
                    <span className="ml-1.5 text-[15px] font-medium text-content-muted">
                      {figure.unit}
                    </span>
                  </p>
                  <p className="mt-2 text-[12.5px] text-content-muted">
                    {scanning ? (
                      measuring ? (
                        <>
                          measured {formatCount(progress?.measuredItems ?? 0)} of{' '}
                          {formatCount(progress?.foundItems ?? 0)} folders
                        </>
                      ) : (
                        <>
                          {formatCount(progress?.foundItems ?? 0)} folders flagged so far, sizes
                          measured next
                        </>
                      )
                    ) : (
                      result && (
                        <>
                          checked of {formatBytes(result.totalSize)} found in{' '}
                          {formatCount(result.totalItems)} folders across{' '}
                          {formatCount(result.totalProjects)}{' '}
                          {result.totalProjects === 1 ? 'project' : 'projects'}
                        </>
                      )
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3 pb-1">
                  <p className="num text-[11px] text-content-subtle">
                    {scanning
                      ? `${formatCount(progress?.scannedDirs ?? 0)} folders read · ${formatDuration(progress?.elapsedMs ?? 0)}`
                      : result &&
                        `${formatCount(result.scannedDirs)} folders read in ${formatDuration(result.durationMs)}`}
                  </p>
                  {scanning && (
                    <Button size="sm" variant="outline" onClick={() => void window.api.cancelScan()}>
                      <X className="h-3.5 w-3.5" />
                      Stop
                    </Button>
                  )}
                </div>
              </div>

              {!scanning && result?.cancelled && (
                <p className="mt-3 flex items-center gap-2 text-[12px] text-warn">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  You stopped this scan, so these are only the folders measured so far.
                </p>
              )}

              <div className="mt-5">
                {scanning ? (
                  <>
                    <Progress
                      value={
                        progress && progress.foundItems > 0
                          ? (progress.measuredItems / progress.foundItems) * 100
                          : 0
                      }
                      indeterminate={!measuring}
                    />
                    <LiveFeed progress={progress} />
                  </>
                ) : (
                  <CapacityBand
                    segments={segments}
                    onSelect={(categoryId) => {
                      setExpanded((current) => new Set(current).add(categoryId))
                      document
                        .getElementById(`group-${categoryId}`)
                        ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
                    }}
                  />
                )}
              </div>
            </section>
          )}

          {result && !scanning && result.totalItems === 0 && (
            <EmptyResult
              root={result.root}
              cleaned={cleaned}
              onRescan={() => void runScan(result.root)}
              onBrowse={chooseFolder}
              onOpenSettings={onOpenSettings}
            />
          )}

          {hasResults && !scanning && (
            <>
              <div className="mt-5 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content-subtle" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter by project or path"
                    className="h-8 w-full rounded-lg border border-line bg-surface-1 pl-8 pr-3 text-[12.5px] text-content transition-colors placeholder:text-content-subtle focus:border-line-strong focus:outline-none"
                  />
                </div>
                <Tooltip content="Expand all">
                  <Button size="icon" variant="outline" onClick={expandAll} aria-label="Expand all">
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  </Button>
                </Tooltip>
                <Tooltip content="Collapse all">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={collapseAll}
                    aria-label="Collapse all"
                  >
                    <ChevronsDownUp className="h-3.5 w-3.5" />
                  </Button>
                </Tooltip>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleSelection(allItems.map((i) => i.path), true)}
                >
                  Check all
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleSelection(allItems.map((i) => i.path), false)}
                >
                  Uncheck all
                </Button>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-lg border border-warn/35 bg-warn/[0.07]">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left"
                    onClick={() => setShowErrors((v) => !v)}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warn" />
                    <span className="text-[12px] text-content-muted">
                      Skipped {formatCount(result.errors.length)}{' '}
                      {result.errors.length === 1 ? 'path' : 'paths'} that could not be read
                    </span>
                    <span className="ml-auto text-[11px] text-content-subtle">
                      {showErrors ? 'Hide' : 'Show'}
                    </span>
                  </button>
                  {showErrors && (
                    <ul className="selectable max-h-40 space-y-1 overflow-y-auto border-t border-warn/25 px-3 py-2">
                      {result.errors.map((entry) => (
                        <li key={entry.path} className="flex gap-3 font-mono text-[11px]">
                          <span className="min-w-0 flex-1 truncate text-content-muted">
                            {entry.path}
                          </span>
                          <span className="shrink-0 text-content-subtle">{entry.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="mt-4">
                <TreeView
                  key={scanKey}
                  groups={filteredGroups}
                  selected={selected}
                  expanded={expanded}
                  revealLabel={revealLabelFor(platform)}
                  scrollParent={scrollRef}
                  onToggleExpand={toggleExpand}
                  onToggleSelection={toggleSelection}
                  onReveal={(path) => void window.api.revealPath(path)}
                  onCopyPath={(path) => void window.api.copyText(path)}
                  onProtect={protectPath}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {hasResults && (
        <footer className="flex h-16 shrink-0 items-center gap-4 border-t border-line bg-surface-1 px-6">
          <p className="text-[12.5px] text-content-muted">
            <span className="num font-medium text-content">
              {formatCount(selectedPaths.length)}
            </span>{' '}
            of {formatCount(result.totalItems)} folders checked
          </p>
          <Button
            size="lg"
            variant="danger"
            className="ml-auto"
            disabled={selectedPaths.length === 0 || busy}
            loading={status === 'deleting'}
            onClick={startDelete}
          >
            {status !== 'deleting' && <Trash2 className="h-4 w-4" />}
            {status === 'deleting'
              ? deleteProgress && deleteProgress.filesTotal > 0
                ? `Removing ${Math.round((deleteProgress.filesDeleted / deleteProgress.filesTotal) * 100)}%`
                : 'Removing'
              : trash
                ? `Move ${formatCount(selectedPaths.length)} to trash`
                : `Delete ${formatCount(selectedPaths.length)} folders`}
          </Button>
        </footer>
      )}

      <Dialog open={confirmOpen} onOpenChange={(open) => !busy && setConfirmOpen(open)}>
        <DialogContent>
          <DialogTitle>
            {trash ? 'Move' : 'Delete'} {formatCount(selectedPaths.length)}{' '}
            {selectedPaths.length === 1 ? 'folder' : 'folders'}
            {trash ? ' to trash?' : '?'}
          </DialogTitle>
          <DialogDescription>
            {trash
              ? `This frees ${formatBytes(selectedBytes)}. The folders stay recoverable from the trash.`
              : `This frees ${formatBytes(selectedBytes)} and cannot be undone.`}
          </DialogDescription>

          <ul className="mt-4 space-y-1.5 border-t border-line pt-3.5">
            {[...selectedItems]
              .sort((a, b) => b.size - a.size)
              .slice(0, 4)
              .map((item) => (
                <li key={item.path} className="flex items-baseline gap-4">
                  <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-content-muted">
                    {item.path}
                  </span>
                  <span className="num shrink-0 text-[11.5px] text-content">
                    {formatBytes(item.size)}
                  </span>
                </li>
              ))}
            {selectedItems.length > 4 && (
              <li className="text-[11.5px] text-content-subtle">
                and {formatCount(selectedItems.length - 4)} more
              </li>
            )}
          </ul>

          {status === 'deleting' && deleteProgress && (
            <DeleteProgressPanel progress={deleteProgress} />
          )}

          <div className="mt-5 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="lg" disabled={status === 'deleting'}>
                Keep them
              </Button>
            </DialogClose>
            <Button
              variant="danger"
              size="lg"
              loading={status === 'deleting'}
              onClick={confirmDelete}
            >
              {trash ? 'Move to trash' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DeleteProgressPanel({ progress }: { progress: DeleteProgress }): JSX.Element {
  const hasTotal = progress.filesTotal > 0
  const ratio = hasTotal ? (progress.filesDeleted / progress.filesTotal) * 100 : 0

  return (
    <div className="mt-4 border-t border-line pt-3.5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="min-w-0 truncate text-[12.5px] text-content">
          {progress.currentItem ? `Removing ${baseName(progress.currentItem)}` : 'Removing'}
        </p>
        <p className="num shrink-0 text-[11.5px] text-content-muted">
          {hasTotal
            ? `${formatCount(progress.filesDeleted)} of ${formatCount(progress.filesTotal)} files`
            : `${formatCount(progress.filesDeleted)} files`}
        </p>
      </div>

      <Progress className="mt-2.5" value={ratio} indeterminate={!hasTotal} />

      <div className="mt-2 flex items-baseline justify-between gap-4">
        <p className="min-w-0 truncate font-mono text-[11px] text-content-subtle">
          {progress.current}
        </p>
        <p className="num shrink-0 text-[11px] text-content-subtle">
          {formatCount(progress.completed)}/{formatCount(progress.total)} folders
        </p>
      </div>
    </div>
  )
}

function baseName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

function LiveFeed({ progress }: { progress: ScanProgress | null }): JSX.Element {
  const rows = progress?.recent ?? []
  return (
    <div className="mt-3">
      <p className="truncate font-mono text-[11px] text-content-subtle">
        {progress?.current ?? ''}
      </p>
      <ul className="mt-2.5 h-[120px] overflow-hidden">
        {rows.map((entry, index) => (
          <li
            key={entry.path}
            className="flex animate-enter items-baseline gap-3 py-[3px]"
            style={{ opacity: 1 - index * 0.13 }}
          >
            <span
              className="translate-y-[-1px] h-[6px] w-[6px] shrink-0 rounded-[2px]"
              style={{ backgroundColor: CATEGORY_BY_ID.get(entry.categoryId)?.accent ?? '#7C8592' }}
            />
            <span className="shrink-0 font-mono text-[11.5px] text-content">{entry.name}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-content-subtle">
              {entry.path}
            </span>
            {entry.size !== undefined && (
              <span className="num shrink-0 text-[11.5px] text-content-muted">
                {formatBytes(entry.size)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function splitPath(root: string): { head: string; leaf: string } {
  const separator = root.includes('\\') ? '\\' : '/'
  const parts = root.split(separator).filter(Boolean)
  const leaf = parts.pop() ?? root
  return { head: parts.length ? `${parts.join(separator)}${separator}` : '', leaf }
}

function PathField({
  root,
  onClick,
  disabled
}: {
  root: string | null
  onClick: () => void
  disabled: boolean
}): JSX.Element {
  const parts = root ? splitPath(root) : null
  const field = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'no-drag flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 text-left',
        'transition-colors duration-[140ms] disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1',
        root
          ? 'border-line bg-surface-2 hover:border-line-strong'
          : 'border-dashed border-line-strong bg-transparent hover:bg-surface-2'
      )}
    >
      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-content-subtle" />
      {parts ? (
        <span className="min-w-0 flex-1 truncate font-mono text-[12px]">
          <span className="text-content-subtle">{parts.head}</span>
          <span className="font-medium text-content">{parts.leaf}</span>
        </span>
      ) : (
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-content-muted">
          Choose a folder to scan
        </span>
      )}
      <span className="shrink-0 text-[11px] text-content-subtle">Change</span>
    </button>
  )
  return root ? <Tooltip content={root}>{field}</Tooltip> : field
}

function pruneResult(result: ScanResult, shouldRemove: (path: string) => boolean): ScanResult {
  const groups = result.groups
    .map((group) => {
      const projects = group.projects
        .map((project) => {
          const items = project.items.filter((item) => !shouldRemove(item.path))
          return items.length
            ? { ...project, items, size: items.reduce((s, i) => s + i.size, 0) }
            : null
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
      return projects.length
        ? {
            ...group,
            projects,
            size: projects.reduce((s, p) => s + p.size, 0),
            itemCount: projects.reduce((s, p) => s + p.items.length, 0)
          }
        : null
    })
    .filter((g): g is ScanCategoryGroup => g !== null)

  const items: ScanItem[] = groups.flatMap((g) => g.projects.flatMap((p) => p.items))
  return {
    ...result,
    groups,
    totalItems: items.length,
    totalProjects: groups.reduce((s, g) => s + g.projects.length, 0),
    totalSize: items.reduce((s, i) => s + i.size, 0)
  }
}

function DeleteSummary({
  result,
  onDismiss
}: {
  result: DeleteResult
  onDismiss: () => void
}): JSX.Element {
  const failed = result.failed.length
  return (
    <div
      className={cn(
        'mb-5 rounded-xl border p-4',
        failed ? 'border-warn/40 bg-warn/[0.07]' : 'border-brand/40 bg-brand/[0.07]'
      )}
    >
      <div className="flex items-start gap-2.5">
        {failed ? (
          <AlertTriangle className="mt-[3px] h-4 w-4 shrink-0 text-warn" />
        ) : (
          <Check className="mt-[3px] h-4 w-4 shrink-0 text-brand" strokeWidth={3} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-content">
            Freed {formatBytes(result.reclaimedBytes)} from {formatCount(result.deleted.length)}{' '}
            {result.deleted.length === 1 ? 'folder' : 'folders'}
            {result.filesDeleted > 0 ? ` and ${formatCount(result.filesDeleted)} files` : ''} in{' '}
            {formatDuration(result.durationMs)}
            {result.usedTrash ? ', moved to trash' : ''}
          </p>
          {failed > 0 && (
            <>
              <p className="mt-1.5 text-[12px] text-content-muted">
                {formatCount(failed)} could not be removed, usually because a process still holds
                them open:
              </p>
              <ul className="selectable mt-1.5 max-h-32 space-y-1 overflow-y-auto">
                {result.failed.map((entry) => (
                  <li key={entry.path} className="flex gap-3 font-mono text-[11px]">
                    <span className="min-w-0 flex-1 truncate text-content-muted">{entry.path}</span>
                    <span className="shrink-0 text-content-subtle">{entry.message}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={onDismiss} aria-label="Dismiss">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function EmptyResult({
  root,
  cleaned,
  onRescan,
  onBrowse,
  onOpenSettings
}: {
  root: string
  cleaned: boolean
  onRescan: () => void
  onBrowse: () => void
  onOpenSettings: () => void
}): JSX.Element {
  return (
    <div className="rounded-xl border border-line bg-surface-1 p-5">
      <p className="text-[13px] font-medium text-content">
        {cleaned ? 'Nothing left to clean here' : 'Nothing to clean here'}
      </p>
      <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-content-muted">
        {cleaned ? (
          <>
            Every folder listed under{' '}
            <span className="font-mono text-content">{root}</span> has been removed. Rescan after
            your next build to see what came back.
          </>
        ) : (
          <>
            Nothing removable turned up under{' '}
            <span className="font-mono text-content">{root}</span>. Either the projects there have
            no build output yet, or the project types that would match are switched off.
          </>
        )}
      </p>
      <div className="mt-3.5 flex gap-2">
        <Button size="sm" variant="outline" onClick={onRescan}>
          <RefreshCw className="h-3.5 w-3.5" />
          Rescan
        </Button>
        <Button size="sm" variant="outline" onClick={onBrowse}>
          Choose another folder
        </Button>
        {!cleaned && (
          <Button size="sm" variant="ghost" onClick={onOpenSettings}>
            Review rules
          </Button>
        )}
      </div>
    </div>
  )
}

const DIAGRAM: Array<[string, string, 'marker' | 'listed' | 'kept']> = [
  ['my-app/', '', 'kept'],
  ['├─ package.json', 'marker', 'marker'],
  ['├─ node_modules/', '412 MB', 'listed'],
  ['├─ dist/', '18 MB', 'listed'],
  ['└─ src/', 'kept', 'kept']
]

function StartState({
  root,
  settings,
  onBrowse,
  onScan,
  onOpenSettings
}: {
  root: string | null
  settings: Settings | null
  onBrowse: () => void
  onScan: () => void
  onOpenSettings: () => void
}): JSX.Element {
  const parts = root ? splitPath(root) : null
  const active = CATEGORIES.filter((c) => settings?.categories[c.id]?.enabled ?? true)
  const activeTargets = active.reduce(
    (sum, c) =>
      sum + c.targets.filter((t) => settings?.categories[c.id]?.targets?.[t.id] ?? true).length,
    0
  )

  return (
    <div className="max-w-[680px] pt-6">
      <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-content">
        {parts ? 'Ready to scan' : 'Choose a folder to scan'}
      </h2>

      {parts ? (
        <p className="selectable mt-2.5 break-all font-mono text-[14px] leading-relaxed">
          <span className="text-content-muted">{parts.head}</span>
          <span className="font-medium text-content">{parts.leaf}</span>
        </p>
      ) : (
        <p className="mt-2 text-[13px] leading-relaxed text-content-muted">
          A folder is listed only when a project marker file sits above it. Nothing outside a real
          project is ever touched, and nothing is removed until you check it.
        </p>
      )}

      <div className="mt-5 flex gap-2">
        {parts ? (
          <>
            <Button variant="primary" size="lg" onClick={onScan}>
              <RefreshCw className="h-4 w-4" />
              Scan this folder
            </Button>
            <Button variant="outline" size="lg" onClick={onBrowse}>
              Choose a different folder
            </Button>
          </>
        ) : (
          <Button variant="primary" size="lg" onClick={onBrowse}>
            <FolderOpen className="h-4 w-4" />
            Choose folder
          </Button>
        )}
      </div>

      <section className="mt-7">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-content-subtle">
            Rules in effect
          </h3>
          <button
            onClick={onOpenSettings}
            className="text-[11.5px] text-content-muted underline-offset-2 transition-colors hover:text-content hover:underline"
          >
            Edit
          </button>
        </div>

        <div className="mt-2.5 overflow-hidden rounded-xl border border-line bg-surface-1">
          <div className="flex gap-6 px-4 py-3">
            <p className="w-[7.5rem] shrink-0 text-[12.5px] font-medium leading-5 text-content">
              Looking for
            </p>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {active.map((category) => (
                  <span key={category.id} className="flex items-baseline gap-1.5">
                    <span
                      className="translate-y-[-1px] h-[7px] w-[7px] shrink-0 rounded-[2px]"
                      style={{ backgroundColor: category.accent }}
                    />
                    <span className="text-[11.5px] leading-5 text-content-muted">
                      {category.label}
                    </span>
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-content-subtle">
                {formatCount(active.length)} of {formatCount(CATEGORIES.length)} project types,{' '}
                {formatCount(activeTargets)} folder names
              </p>
            </div>
          </div>

          <PreflightRow label="Depth" value={`${settings?.maxDepth ?? 12} levels below the folder`} />
          <PreflightRow
            label="Hidden folders"
            value={settings?.scanHiddenDirs === false ? 'skipped' : 'scanned'}
          />
          <PreflightRow
            label="Symlinks"
            value={settings?.followSymlinks ? 'followed' : 'not followed'}
          />
          <PreflightRow
            label="Deleting"
            value={settings?.useTrash ? 'moved to the trash' : 'removed permanently'}
          />
        </div>
      </section>

      <section className="mt-7">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-content-subtle">
          How a folder is chosen
        </h3>
        <div className="mt-2.5 rounded-xl border border-line bg-surface-1 px-4 py-3.5">
          {DIAGRAM.map(([left, right, kind]) => (
            <div key={left} className="flex items-baseline gap-4 py-[3px] font-mono text-[12px]">
              <span
                className={cn(
                  'min-w-0 flex-1 truncate',
                  kind === 'listed' ? 'text-content' : 'text-content-muted'
                )}
              >
                {left}
              </span>
              <span
                className={cn(
                  'num shrink-0 text-[11.5px]',
                  kind === 'listed' ? 'text-brand' : 'text-content-subtle'
                )}
              >
                {right}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function PreflightRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-baseline gap-6 border-t border-line px-4 py-2.5">
      <p className="w-[7.5rem] shrink-0 text-[12.5px] font-medium leading-5 text-content">
        {label}
      </p>
      <p className="min-w-0 flex-1 text-[12px] leading-5 text-content-muted">{value}</p>
    </div>
  )
}
