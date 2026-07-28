export type ThemePreference = 'system' | 'dark' | 'light'

export interface CategorySettings {
  enabled: boolean
  targets: Record<string, boolean>
}

export interface Settings {
  schemaVersion: number
  categories: Record<string, CategorySettings>
  maxDepth: number
  followSymlinks: boolean
  scanHiddenDirs: boolean
  useTrash: boolean
  confirmBeforeDelete: boolean
  ignoredNames: string[]
  protectedPaths: string[]
  theme: ThemePreference
  lastDirectory: string | null
}

export interface ScanItem {
  path: string
  name: string
  kind: 'dir' | 'file'
  categoryId: string
  targetId: string
  projectPath: string
  size: number
  fileCount: number
  modifiedAt: number
}

export interface ScanProject {
  id: string
  path: string
  name: string
  relativePath: string
  categoryId: string
  items: ScanItem[]
  size: number
}

export interface ScanCategoryGroup {
  categoryId: string
  label: string
  projects: ScanProject[]
  size: number
  itemCount: number
}

export interface ScanResult {
  root: string
  groups: ScanCategoryGroup[]
  totalSize: number
  totalItems: number
  totalProjects: number
  scannedDirs: number
  durationMs: number
  cancelled: boolean
  errors: ScanError[]
}

export interface ScanError {
  path: string
  message: string
}

export type ScanPhase = 'walking' | 'measuring' | 'done'

export interface ScanProgress {
  phase: ScanPhase
  current: string
  scannedDirs: number
  foundItems: number
  measuredItems: number
  bytesFound: number
  elapsedMs: number
  recent: RecentFind[]
}

export interface RecentFind {
  path: string
  name: string
  categoryId: string
  size?: number
}

export interface DeleteRequest {
  root: string
  paths: string[]
  sizes: Record<string, number>
  fileCounts: Record<string, number>
}

export interface DeleteFailure {
  path: string
  message: string
}

export interface DeleteResult {
  deleted: string[]
  failed: DeleteFailure[]
  reclaimedBytes: number
  filesDeleted: number
  usedTrash: boolean
  durationMs: number
}

export interface DeleteProgress {
  current: string
  currentItem: string
  completed: number
  total: number
  reclaimedBytes: number
  filesDeleted: number
  filesTotal: number
}

export interface AppInfo {
  version: string
  electron: string
  node: string
  chrome: string
  platform: NodeJS.Platform
}
