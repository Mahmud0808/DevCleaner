import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppInfo,
  DeleteProgress,
  DeleteRequest,
  DeleteResult,
  ScanProgress,
  ScanResult,
  Settings
} from '@shared/types'

const api = {
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('get-settings'),
  saveSettings: (patch: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke('save-settings', patch),
  resetSettings: (): Promise<Settings> => ipcRenderer.invoke('reset-settings'),
  getSettingsPath: (): Promise<string> => ipcRenderer.invoke('get-settings-path'),
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke('get-app-info'),

  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('select-directory'),
  pickFolder: (title: string): Promise<string | null> => ipcRenderer.invoke('pick-folder', title),
  copyText: (text: string): Promise<void> => ipcRenderer.invoke('copy-text', text),
  validateDirectory: (path: string): Promise<boolean> =>
    ipcRenderer.invoke('validate-directory', path),

  scanDirectory: (root: string): Promise<ScanResult> => ipcRenderer.invoke('scan-directory', root),
  cancelScan: (): Promise<boolean> => ipcRenderer.invoke('cancel-scan'),
  deleteItems: (request: DeleteRequest): Promise<DeleteResult> =>
    ipcRenderer.invoke('delete-items', request),

  revealPath: (path: string): Promise<void> => ipcRenderer.invoke('reveal-path', path),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),

  onScanProgress: (callback: (progress: ScanProgress) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, progress: ScanProgress): void =>
      callback(progress)
    ipcRenderer.on('scan:progress', listener)
    return () => ipcRenderer.removeListener('scan:progress', listener)
  },
  onDeleteProgress: (callback: (progress: DeleteProgress) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, progress: DeleteProgress): void =>
      callback(progress)
    ipcRenderer.on('delete:progress', listener)
    return () => ipcRenderer.removeListener('delete:progress', listener)
  },
  onThemeChanged: (callback: (theme: 'dark' | 'light') => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, theme: 'dark' | 'light'): void =>
      callback(theme)
    ipcRenderer.on('theme:changed', listener)
    return () => ipcRenderer.removeListener('theme:changed', listener)
  }
}

export type DevCleanerApi = typeof api

contextBridge.exposeInMainWorld('api', api)
