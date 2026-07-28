import { promises as fs } from 'fs'
import type { Dirent } from 'fs'
import { basename, join, relative, sep } from 'path'
import { CATEGORIES, NEVER_TRAVERSE } from '@shared/rules'
import type { CategoryRule, TargetRule } from '@shared/rules'
import type {
  ScanCategoryGroup,
  ScanError,
  ScanItem,
  ScanProgress,
  ScanProject,
  ScanResult,
  Settings
} from '@shared/types'
import { createLimiter, measurePath } from './fs-utils'
import type { CancelToken } from './fs-utils'

const CASE_INSENSITIVE_FS = process.platform !== 'linux'
const WALK_CONCURRENCY = 12
const MEASURE_CONCURRENCY = 6
const PROGRESS_INTERVAL_MS = 80
const HEARTBEAT_MS = 350
const RECENT_LIMIT = 6
const MAX_ERRORS = 200

interface EnabledTarget {
  target: TargetRule
  segments?: string[]
}

interface WalkJob {
  dir: string
  depth: number
  inherited: Map<string, string>
}

function nameEquals(a: string, b: string): boolean {
  return CASE_INSENSITIVE_FS ? a.toLowerCase() === b.toLowerCase() : a === b
}

function matchesIndicator(entries: Dirent[], indicators: string[]): boolean {
  for (const indicator of indicators) {
    if (indicator.startsWith('*.')) {
      const ext = indicator.slice(1)
      const hit = entries.some(
        (e) => e.name.length > ext.length && nameEquals(e.name.slice(-ext.length), ext)
      )
      if (hit) return true
    } else if (entries.some((e) => nameEquals(e.name, indicator))) {
      return true
    }
  }
  return false
}

function collectEnabledTargets(settings: Settings): {
  byCategory: Map<string, EnabledTarget[]>
  indicatorCategories: CategoryRule[]
  globalCategories: CategoryRule[]
} {
  const byCategory = new Map<string, EnabledTarget[]>()
  const indicatorCategories: CategoryRule[] = []
  const globalCategories: CategoryRule[] = []

  for (const category of CATEGORIES) {
    const categorySettings = settings.categories[category.id]
    if (!categorySettings?.enabled) continue
    const targets = category.targets
      .filter((t) => categorySettings.targets[t.id] !== false)
      .map<EnabledTarget>((target) => ({
        target,
        segments: target.match.includes('/') ? target.match.split('/') : undefined
      }))
    if (targets.length === 0) continue
    byCategory.set(category.id, targets)
    if (category.global) globalCategories.push(category)
    else indicatorCategories.push(category)
  }

  return { byCategory, indicatorCategories, globalCategories }
}

export interface ScanOptions {
  root: string
  settings: Settings
  token: CancelToken
  onProgress?: (progress: ScanProgress) => void
}

export async function scanDirectory({
  root,
  settings,
  token,
  onProgress
}: ScanOptions): Promise<ScanResult> {
  const startedAt = Date.now()
  const { byCategory, indicatorCategories, globalCategories } = collectEnabledTargets(settings)

  const neverTraverse = new Set(
    [...NEVER_TRAVERSE, ...settings.ignoredNames].map((n) =>
      CASE_INSENSITIVE_FS ? n.toLowerCase() : n
    )
  )
  const isBlocked = (name: string): boolean =>
    neverTraverse.has(CASE_INSENSITIVE_FS ? name.toLowerCase() : name)

  const protectedPaths = settings.protectedPaths.map((p) =>
    CASE_INSENSITIVE_FS ? p.toLowerCase() : p
  )
  const isProtected = (path: string): boolean => {
    if (protectedPaths.length === 0) return false
    const candidate = CASE_INSENSITIVE_FS ? path.toLowerCase() : path
    return protectedPaths.some(
      (p) => candidate === p || candidate.startsWith(p.endsWith(sep) ? p : p + sep)
    )
  }

  const foundItems = new Map<string, ScanItem>()
  const errors: ScanError[] = []
  let scannedDirs = 0

  const progress: ScanProgress = {
    phase: 'walking',
    current: root,
    scannedDirs: 0,
    foundItems: 0,
    measuredItems: 0,
    bytesFound: 0,
    elapsedMs: 0,
    recent: []
  }
  let lastEmit = 0
  const emit = (force = false): void => {
    const now = Date.now()
    if (!force && now - lastEmit < PROGRESS_INTERVAL_MS) return
    lastEmit = now
    progress.elapsedMs = now - startedAt
    onProgress?.({ ...progress, recent: [...progress.recent] })
  }

  const heartbeat = setInterval(() => emit(true), HEARTBEAT_MS)
  heartbeat.unref()

  const pushError = (path: string, error: unknown): void => {
    if (errors.length >= MAX_ERRORS) return
    errors.push({ path, message: error instanceof Error ? error.message : String(error) })
  }

  const limit = createLimiter(WALK_CONCURRENCY)
  let pending = 0

  await new Promise<void>((resolve) => {
    let settled = false
    const done = (): void => {
      if (!settled) {
        settled = true
        resolve()
      }
    }

    const schedule = (job: WalkJob): void => {
      pending++
      void limit(() => processDir(job))
        .catch((error) => pushError(job.dir, error))
        .finally(() => {
          pending--
          if (pending === 0) done()
        })
    }

    const processDir = async (job: WalkJob): Promise<void> => {
      if (token.cancelled) return

      let entries: Dirent[]
      try {
        entries = await fs.readdir(job.dir, { withFileTypes: true })
      } catch (error) {
        pushError(job.dir, error)
        return
      }

      scannedDirs++
      progress.scannedDirs = scannedDirs
      progress.current = job.dir
      emit()

      const active = new Map(job.inherited)
      for (const category of indicatorCategories) {
        if (matchesIndicator(entries, category.indicators)) active.set(category.id, job.dir)
      }

      const flaggedHere = new Set<string>()

      const addItem = (
        path: string,
        name: string,
        target: TargetRule,
        categoryId: string,
        projectPath: string
      ): void => {
        if (foundItems.has(path) || isProtected(path)) return
        foundItems.set(path, {
          path,
          name,
          kind: target.kind,
          categoryId,
          targetId: target.id,
          projectPath,
          size: 0,
          fileCount: 0,
          modifiedAt: 0
        })
        progress.foundItems = foundItems.size
        progress.recent.unshift({ path, name, categoryId })
        if (progress.recent.length > RECENT_LIMIT) progress.recent.length = RECENT_LIMIT
        emit()
      }

      for (const [categoryId, projectPath] of active) {
        const targets = byCategory.get(categoryId)
        if (!targets) continue

        for (const { target, segments } of targets) {
          if (segments) {
            if (job.dir !== projectPath) continue
            const path = join(projectPath, ...segments)
            try {
              const stat = await fs.lstat(path)
              if (stat.isSymbolicLink()) continue
              if (target.kind === 'dir' ? stat.isDirectory() : stat.isFile()) {
                addItem(path, target.match, target, categoryId, projectPath)
              }
            } catch {
              continue
            }
            continue
          }

          for (const entry of entries) {
            if (!nameEquals(entry.name, target.match)) continue
            if (entry.isSymbolicLink()) continue
            if (target.kind === 'dir' ? !entry.isDirectory() : !entry.isFile()) continue
            flaggedHere.add(entry.name)
            addItem(join(job.dir, entry.name), entry.name, target, categoryId, projectPath)
          }
        }
      }

      if (job.depth >= settings.maxDepth) return

      for (const entry of entries) {
        if (token.cancelled) return
        const isLink = entry.isSymbolicLink()
        if (isLink && !settings.followSymlinks) continue
        if (!entry.isDirectory() && !isLink) continue
        if (flaggedHere.has(entry.name)) continue
        if (isBlocked(entry.name)) continue
        if (!settings.scanHiddenDirs && entry.name.startsWith('.')) continue

        const child = join(job.dir, entry.name)
        if (isProtected(child)) continue
        if (isLink) {
          try {
            const stat = await fs.stat(child)
            if (!stat.isDirectory()) continue
          } catch {
            continue
          }
        }
        schedule({ dir: child, depth: job.depth + 1, inherited: active })
      }
    }

    const rootInherited = new Map<string, string>()
    for (const category of globalCategories) rootInherited.set(category.id, root)
    schedule({ dir: root, depth: 0, inherited: rootInherited })
  })

  emit(true)

  progress.phase = 'measuring'
  progress.recent = []
  emit(true)

  const items = [...foundItems.values()]
  const measureLimit = createLimiter(MEASURE_CONCURRENCY)
  const measuredPaths = new Set<string>()
  let measured = 0

  await Promise.all(
    items.map((item) =>
      measureLimit(async () => {
        if (token.cancelled) return
        progress.current = item.path
        try {
          const { size, fileCount, modifiedAt } = await measurePath(item.path, token, 16)
          item.size = size
          item.fileCount = fileCount
          item.modifiedAt = modifiedAt
          measuredPaths.add(item.path)
          progress.bytesFound += size
          progress.recent.unshift({
            path: item.path,
            name: item.name,
            categoryId: item.categoryId,
            size
          })
          if (progress.recent.length > RECENT_LIMIT) progress.recent.length = RECENT_LIMIT
        } catch (error) {
          pushError(item.path, error)
        }
        measured++
        progress.measuredItems = measured
        emit()
      })
    )
  )

  clearInterval(heartbeat)
  progress.phase = 'done'
  emit(true)

  const reported = token.cancelled ? items.filter((i) => measuredPaths.has(i.path)) : items
  const groups = buildGroups(root, reported)

  return {
    root,
    groups,
    totalSize: reported.reduce((sum, i) => sum + i.size, 0),
    totalItems: reported.length,
    totalProjects: groups.reduce((sum, g) => sum + g.projects.length, 0),
    scannedDirs,
    durationMs: Date.now() - startedAt,
    cancelled: token.cancelled,
    errors
  }
}

function buildGroups(root: string, items: ScanItem[]): ScanCategoryGroup[] {
  const projectsByCategory = new Map<string, Map<string, ScanProject>>()

  for (const item of items) {
    let byPath = projectsByCategory.get(item.categoryId)
    if (!byPath) {
      byPath = new Map()
      projectsByCategory.set(item.categoryId, byPath)
    }
    let project = byPath.get(item.projectPath)
    if (!project) {
      const rel = relative(root, item.projectPath)
      project = {
        id: `${item.projectPath}::${item.categoryId}`,
        path: item.projectPath,
        name: basename(item.projectPath) || item.projectPath,
        relativePath: rel === '' ? '.' : rel,
        categoryId: item.categoryId,
        items: [],
        size: 0
      }
      byPath.set(item.projectPath, project)
    }
    project.items.push(item)
    project.size += item.size
  }

  const groups: ScanCategoryGroup[] = []
  for (const category of CATEGORIES) {
    const byPath = projectsByCategory.get(category.id)
    if (!byPath || byPath.size === 0) continue
    const projects = [...byPath.values()].sort((a, b) => b.size - a.size)
    for (const project of projects) project.items.sort((a, b) => b.size - a.size)
    groups.push({
      categoryId: category.id,
      label: category.label,
      projects,
      size: projects.reduce((sum, p) => sum + p.size, 0),
      itemCount: projects.reduce((sum, p) => sum + p.items.length, 0)
    })
  }
  return groups.sort((a, b) => b.size - a.size)
}
