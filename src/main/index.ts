import { app, BrowserWindow, clipboard, dialog, ipcMain, nativeTheme, shell } from 'electron'
import { join } from 'path'
import { existsSync, promises as fs } from 'fs'
import type {
  AppInfo,
  DeleteRequest,
  DeleteResult,
  ScanResult,
  Settings,
  ThemePreference
} from '@shared/types'
import { getSettings, resetSettings, saveSettings, settingsFilePath } from './settings'
import { scanDirectory } from './scanner'
import { deleteItems } from './deleter'
import type { CancelToken } from './fs-utils'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
let activeScan: CancelToken | null = null

const TITLEBAR = {
  dark: { color: '#111317', symbolColor: '#9AA2AE' },
  light: { color: '#FFFFFF', symbolColor: '#5C6572' }
}

function titleBarColors(): { color: string; symbolColor: string; height: number } {
  const palette = nativeTheme.shouldUseDarkColors ? TITLEBAR.dark : TITLEBAR.light
  return { ...palette, height: 47 }
}

function windowIcon(): string | undefined {
  for (const candidate of [
    join(__dirname, '../../build/icon.png'),
    join(process.resourcesPath, 'icon.png')
  ]) {
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

function createWindow(): void {
  const icon = windowIcon()

  mainWindow = new BrowserWindow({
    ...(icon ? { icon } : {}),
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 620,
    show: false,
    title: 'Dev Cleaner',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0C0D10' : '#F7F8FA',
    autoHideMenuBar: true,
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 16, y: 16 } }
      : { titleBarStyle: 'hidden' as const, titleBarOverlay: titleBarColors() }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function applyTheme(preference: ThemePreference): void {
  nativeTheme.themeSource = preference
}

function broadcastTheme(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (process.platform !== 'darwin') {
    try {
      mainWindow.setTitleBarOverlay(titleBarColors())
    } catch {
      /* overlay unsupported on this platform */
    }
  }
  mainWindow.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#0C0D10' : '#F7F8FA')
  mainWindow.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
}

function registerIpc(): void {
  ipcMain.handle('get-settings', (): Settings => getSettings())

  ipcMain.handle('save-settings', (_event, patch: Partial<Settings>): Settings => {
    const saved = saveSettings(patch)
    if (patch.theme) {
      applyTheme(saved.theme)
      broadcastTheme()
    }
    return saved
  })

  ipcMain.handle('reset-settings', (): Settings => {
    const defaults = resetSettings()
    applyTheme(defaults.theme)
    broadcastTheme()
    return defaults
  })

  ipcMain.handle('get-app-info', (): AppInfo => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    platform: process.platform
  }))

  ipcMain.handle('get-settings-path', (): string => settingsFilePath())

  ipcMain.handle('select-directory', async (): Promise<string | null> => {
    if (!mainWindow) return null
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose a folder to scan',
      properties: ['openDirectory', 'dontAddToRecent'],
      defaultPath: getSettings().lastDirectory ?? app.getPath('home')
    })
    if (canceled || filePaths.length === 0) return null
    saveSettings({ lastDirectory: filePaths[0] })
    return filePaths[0]
  })

  ipcMain.handle('pick-folder', async (_event, title: string): Promise<string | null> => {
    if (!mainWindow) return null
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title,
      properties: ['openDirectory', 'dontAddToRecent']
    })
    return canceled || filePaths.length === 0 ? null : filePaths[0]
  })

  ipcMain.handle('copy-text', (_event, text: string): void => {
    clipboard.writeText(String(text))
  })

  ipcMain.handle('validate-directory', async (_event, path: string): Promise<boolean> => {
    try {
      const stat = await fs.stat(path)
      return stat.isDirectory()
    } catch {
      return false
    }
  })

  ipcMain.handle('scan-directory', async (event, root: string): Promise<ScanResult> => {
    if (activeScan) activeScan.cancelled = true
    const token: CancelToken = { cancelled: false }
    activeScan = token

    const settings = getSettings()
    saveSettings({ lastDirectory: root })

    try {
      return await scanDirectory({
        root,
        settings,
        token,
        onProgress: (progress) => {
          if (!event.sender.isDestroyed()) event.sender.send('scan:progress', progress)
        }
      })
    } finally {
      if (activeScan === token) activeScan = null
    }
  })

  ipcMain.handle('cancel-scan', (): boolean => {
    if (!activeScan) return false
    activeScan.cancelled = true
    return true
  })

  ipcMain.handle('delete-items', async (event, request: DeleteRequest): Promise<DeleteResult> => {
    const settings = getSettings()
    return deleteItems({
      ...request,
      useTrash: settings.useTrash,
      protectedPaths: settings.protectedPaths,
      onProgress: (progress) => {
        if (!event.sender.isDestroyed()) event.sender.send('delete:progress', progress)
      }
    })
  })

  ipcMain.handle('reveal-path', async (_event, path: string): Promise<void> => {
    shell.showItemInFolder(path)
  })

  ipcMain.handle('open-external', async (_event, url: string): Promise<void> => {
    if (/^https?:\/\//i.test(url)) await shell.openExternal(url)
  })
}

app.whenReady().then(() => {
  app.setName('Dev Cleaner')
  applyTheme(getSettings().theme)
  nativeTheme.on('updated', broadcastTheme)

  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (activeScan) activeScan.cancelled = true
})
