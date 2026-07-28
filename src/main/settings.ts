import { isAbsolute, resolve } from 'path'
import Store from 'electron-store'
import { CATEGORIES } from '@shared/rules'
import type { Settings } from '@shared/types'

const SCHEMA_VERSION = 2

export function buildDefaultSettings(): Settings {
  const categories: Settings['categories'] = {}
  for (const category of CATEGORIES) {
    categories[category.id] = {
      enabled: true,
      targets: Object.fromEntries(
        category.targets.map((t) => [t.id, t.defaultEnabled !== false])
      )
    }
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    categories,
    maxDepth: 12,
    followSymlinks: false,
    scanHiddenDirs: true,
    useTrash: false,
    confirmBeforeDelete: true,
    ignoredNames: [],
    protectedPaths: [],
    theme: 'system',
    lastDirectory: null
  }
}

const store = new Store<{ settings: Settings }>({
  name: 'dev-cleaner-settings',
  defaults: { settings: buildDefaultSettings() }
})

export function normalizeSettings(partial: Partial<Settings> | undefined): Settings {
  const defaults = buildDefaultSettings()
  if (!partial) return defaults

  const storedVersion = typeof partial.schemaVersion === 'number' ? partial.schemaVersion : 1

  const categories: Settings['categories'] = {}
  for (const category of CATEGORIES) {
    const stored = partial.categories?.[category.id]
    const targets: Record<string, boolean> = {}
    for (const target of category.targets) {
      const optOut = target.defaultEnabled === false
      targets[target.id] =
        optOut && storedVersion < 2 ? false : (stored?.targets?.[target.id] ?? !optOut)
    }
    categories[category.id] = { enabled: stored?.enabled ?? true, targets }
  }

  const theme = partial.theme
  return {
    schemaVersion: SCHEMA_VERSION,
    categories,
    maxDepth: clampInt(partial.maxDepth, 1, 40, defaults.maxDepth),
    followSymlinks: partial.followSymlinks ?? defaults.followSymlinks,
    scanHiddenDirs: partial.scanHiddenDirs ?? defaults.scanHiddenDirs,
    useTrash: partial.useTrash ?? defaults.useTrash,
    confirmBeforeDelete: partial.confirmBeforeDelete ?? defaults.confirmBeforeDelete,
    ignoredNames: Array.isArray(partial.ignoredNames)
      ? partial.ignoredNames.map((n) => String(n).trim()).filter(Boolean).slice(0, 200)
      : defaults.ignoredNames,
    protectedPaths: Array.isArray(partial.protectedPaths)
      ? [
          ...new Set(
            partial.protectedPaths
              .map((p) => String(p).trim())
              .filter((p) => p.length > 0 && isAbsolute(p))
              .map((p) => resolve(p))
          )
        ].slice(0, 500)
      : defaults.protectedPaths,
    theme: theme === 'dark' || theme === 'light' || theme === 'system' ? theme : defaults.theme,
    lastDirectory: typeof partial.lastDirectory === 'string' ? partial.lastDirectory : null
  }
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? Math.round(value) : Number.NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function getSettings(): Settings {
  return normalizeSettings(store.get('settings'))
}

export function saveSettings(next: Partial<Settings>): Settings {
  const merged = normalizeSettings({ ...getSettings(), ...next })
  store.set('settings', merged)
  return merged
}

export function resetSettings(): Settings {
  const defaults = buildDefaultSettings()
  store.set('settings', defaults)
  return defaults
}

export function settingsFilePath(): string {
  return store.path
}
