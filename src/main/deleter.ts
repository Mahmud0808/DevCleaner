import { promises as fs } from 'fs'
import type { Dirent } from 'fs'
import { isAbsolute, join, parse, relative, resolve, sep } from 'path'
import { shell } from 'electron'
import { CATEGORIES } from '@shared/rules'
import type { DeleteFailure, DeleteProgress, DeleteRequest, DeleteResult } from '@shared/types'
import { createLimiter } from './fs-utils'

const CASE_INSENSITIVE_FS = process.platform !== 'linux'
const UNLINK_CONCURRENCY = 64
const UNLINK_ATTEMPTS = 3
const PROGRESS_INTERVAL_MS = 80

const ALLOWED_NAMES = new Set(
  CATEGORIES.flatMap((c) => c.targets.map((t) => t.match.split('/').pop() as string)).map((n) =>
    CASE_INSENSITIVE_FS ? n.toLowerCase() : n
  )
)

function isInside(root: string, target: string): boolean {
  const rel = relative(root, target)
  return rel.length > 0 && !rel.startsWith('..') && !isAbsolute(rel)
}

function validate(root: string, target: string, protectedPaths: string[]): string | null {
  const resolvedRoot = resolve(root)
  const resolvedTarget = resolve(target)

  if (!isInside(resolvedRoot, resolvedTarget)) return 'Outside of the scanned folder'

  const candidate = CASE_INSENSITIVE_FS ? resolvedTarget.toLowerCase() : resolvedTarget
  for (const entry of protectedPaths) {
    const guard = CASE_INSENSITIVE_FS ? entry.toLowerCase() : entry
    if (candidate === guard || candidate.startsWith(guard.endsWith(sep) ? guard : guard + sep)) {
      return 'Protected in settings'
    }
  }

  const parsed = parse(resolvedTarget)
  if (parsed.root === resolvedTarget) return 'Refusing to delete a filesystem root'

  const name = parsed.base
  if (!ALLOWED_NAMES.has(CASE_INSENSITIVE_FS ? name.toLowerCase() : name)) {
    return `"${name}" is not a known removable target`
  }

  return null
}

function delay(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms))
}

function errorCode(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException | undefined)?.code
}

interface RemovalContext {
  limit: <T>(fn: () => Promise<T>) => Promise<T>
  onEntry: (path: string, counted: boolean) => void
  failures: number
  firstError: string | null
}

async function removeFile(path: string, ctx: RemovalContext): Promise<void> {
  for (let attempt = 1; attempt <= UNLINK_ATTEMPTS; attempt++) {
    try {
      await fs.unlink(path)
      ctx.onEntry(path, true)
      return
    } catch (error) {
      const code = errorCode(error)
      if (code === 'ENOENT') return
      if (code === 'EPERM' || code === 'EACCES') {
        try {
          await fs.chmod(path, 0o666)
        } catch {
          /* keep going, the retry may still succeed */
        }
      }
      if (code === 'EISDIR') {
        await removeDirectory(path, ctx)
        return
      }
      if (attempt === UNLINK_ATTEMPTS) {
        ctx.failures++
        ctx.firstError ??= error instanceof Error ? error.message : String(error)
        return
      }
      await delay(60 * attempt)
    }
  }
}

async function removeLink(path: string, ctx: RemovalContext): Promise<void> {
  try {
    await fs.unlink(path)
    ctx.onEntry(path, false)
    return
  } catch (error) {
    const code = errorCode(error)
    if (code === 'ENOENT') return
    if (code !== 'EPERM' && code !== 'EISDIR' && code !== 'EACCES') {
      ctx.failures++
      ctx.firstError ??= error instanceof Error ? error.message : String(error)
      return
    }
  }
  try {
    await fs.rmdir(path)
    ctx.onEntry(path, false)
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return
    ctx.failures++
    ctx.firstError ??= error instanceof Error ? error.message : String(error)
  }
}

async function removeDirectory(dir: string, ctx: RemovalContext): Promise<void> {
  let entries: Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (error) {
    const code = errorCode(error)
    if (code === 'ENOENT') return
    if (code === 'ENOTDIR') {
      await removeFile(dir, ctx)
      return
    }
    ctx.failures++
    ctx.firstError ??= error instanceof Error ? error.message : String(error)
    return
  }

  const files: string[] = []
  const links: string[] = []
  const directories: string[] = []

  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isSymbolicLink()) links.push(path)
    else if (entry.isDirectory()) directories.push(path)
    else files.push(path)
  }

  await Promise.all([
    ...files.map((path) => ctx.limit(() => removeFile(path, ctx))),
    ...links.map((path) => removeLink(path, ctx)),
    ...directories.map((path) => removeDirectory(path, ctx))
  ])

  try {
    await fs.rmdir(dir)
  } catch (error) {
    const code = errorCode(error)
    if (code === 'ENOENT') return
    ctx.failures++
    ctx.firstError ??= error instanceof Error ? error.message : String(error)
  }
}

async function removeTree(
  target: string,
  onEntry: (path: string, counted: boolean) => void
): Promise<{ failures: number; message: string | null }> {
  const ctx: RemovalContext = {
    limit: createLimiter(UNLINK_CONCURRENCY),
    onEntry,
    failures: 0,
    firstError: null
  }

  let stat: Awaited<ReturnType<typeof fs.lstat>>
  try {
    stat = await fs.lstat(target)
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return { failures: 0, message: null }
    throw error
  }

  if (stat.isSymbolicLink()) throw new Error('Refusing to delete a symbolic link')
  if (stat.isDirectory()) await removeDirectory(target, ctx)
  else await removeFile(target, ctx)

  return { failures: ctx.failures, message: ctx.firstError }
}

export interface DeleteOptions extends DeleteRequest {
  useTrash: boolean
  protectedPaths: string[]
  onProgress?: (progress: DeleteProgress) => void
}

export async function deleteItems({
  root,
  paths,
  sizes,
  fileCounts,
  useTrash,
  protectedPaths,
  onProgress
}: DeleteOptions): Promise<DeleteResult> {
  const startedAt = Date.now()
  const deleted: string[] = []
  const failed: DeleteFailure[] = []

  const unique = [...new Set(paths.map((p) => resolve(p)))].sort((a, b) => b.length - a.length)

  const accepted: string[] = []
  for (const target of unique) {
    const rejection = validate(root, target, protectedPaths)
    if (rejection) failed.push({ path: target, message: rejection })
    else accepted.push(target)
  }

  const progress: DeleteProgress = {
    current: '',
    currentItem: '',
    completed: failed.length,
    total: unique.length,
    reclaimedBytes: 0,
    filesDeleted: 0,
    filesTotal: accepted.reduce((sum, path) => sum + (fileCounts[path] ?? 0), 0)
  }

  let lastEmit = 0
  const emit = (force = false): void => {
    const now = Date.now()
    if (!force && now - lastEmit < PROGRESS_INTERVAL_MS) return
    lastEmit = now
    onProgress?.({ ...progress })
  }

  emit(true)

  for (const target of accepted) {
    progress.currentItem = target
    progress.current = target
    emit(true)

    try {
      if (useTrash) {
        await shell.trashItem(target)
        deleted.push(target)
        progress.reclaimedBytes += sizes[target] ?? 0
        progress.filesDeleted += fileCounts[target] ?? 0
      } else {
        const outcome = await removeTree(target, (path, counted) => {
          if (counted) progress.filesDeleted++
          progress.current = path
          emit()
        })

        if (outcome.failures > 0) {
          failed.push({
            path: target,
            message:
              outcome.failures === 1
                ? (outcome.message ?? 'One entry could not be removed')
                : `${outcome.failures} entries could not be removed (${outcome.message ?? 'unknown error'})`
          })
        } else {
          deleted.push(target)
          progress.reclaimedBytes += sizes[target] ?? 0
        }
      }
    } catch (error) {
      failed.push({
        path: target,
        message: error instanceof Error ? error.message : String(error)
      })
    }

    progress.completed = deleted.length + failed.length
    emit(true)
  }

  return {
    deleted,
    failed,
    reclaimedBytes: progress.reclaimedBytes,
    filesDeleted: progress.filesDeleted,
    usedTrash: useTrash,
    durationMs: Date.now() - startedAt
  }
}
