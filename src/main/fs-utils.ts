import { promises as fs } from 'fs'
import type { Dirent } from 'fs'
import { join } from 'path'

export interface CancelToken {
  cancelled: boolean
}

export interface MeasureResult {
  size: number
  fileCount: number
  modifiedAt: number
}

export function createLimiter(concurrency: number) {
  let active = 0
  const queue: Array<() => void> = []

  const next = (): void => {
    if (active >= concurrency) return
    const run = queue.shift()
    if (!run) return
    active++
    run()
  }

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--
            next()
          })
      })
      next()
    })
  }
}

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.lstat(target)
    return true
  } catch {
    return false
  }
}

export async function measurePath(
  target: string,
  token?: CancelToken,
  concurrency = 24
): Promise<MeasureResult> {
  const result: MeasureResult = { size: 0, fileCount: 0, modifiedAt: 0 }

  let rootStat: Awaited<ReturnType<typeof fs.lstat>>
  try {
    rootStat = await fs.lstat(target)
  } catch {
    return result
  }

  if (!rootStat.isDirectory()) {
    result.size = rootStat.size
    result.fileCount = 1
    result.modifiedAt = rootStat.mtimeMs
    return result
  }

  const limit = createLimiter(concurrency)
  let pending = 0
  let settled = false

  return new Promise<MeasureResult>((resolve) => {
    const finish = (): void => {
      if (!settled) {
        settled = true
        resolve(result)
      }
    }

    const walk = (dir: string): void => {
      pending++
      void limit(async () => {
        if (token?.cancelled) return
        let entries: Dirent[] = []
        try {
          entries = await fs.readdir(dir, { withFileTypes: true })
        } catch {
          return
        }
        const stats: Array<Promise<void>> = []
        for (const entry of entries) {
          const full = join(dir, entry.name)
          if (entry.isSymbolicLink()) continue
          if (entry.isDirectory()) {
            walk(full)
          } else if (entry.isFile()) {
            stats.push(
              fs
                .lstat(full)
                .then((s) => {
                  result.size += s.size
                  result.fileCount++
                  if (s.mtimeMs > result.modifiedAt) result.modifiedAt = s.mtimeMs
                })
                .catch(() => undefined)
            )
          }
        }
        await Promise.all(stats)
      })
        .catch(() => undefined)
        .finally(() => {
          pending--
          if (pending === 0) finish()
        })
    }

    walk(target)
  })
}
