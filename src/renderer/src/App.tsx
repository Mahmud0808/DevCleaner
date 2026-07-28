import { useCallback, useState } from 'react'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { Sidebar } from '@/components/Sidebar'
import type { ViewId } from '@/components/Sidebar'
import { ScannerView } from '@/components/ScannerView'
import { SettingsView } from '@/components/SettingsView'
import { AboutView } from '@/components/AboutView'
import { useSettings } from '@/hooks/useSettings'
import { useAppInfo } from '@/hooks/useAppInfo'
import { useThemeClass } from '@/hooks/useThemeClass'
import { formatBytes } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function App(): JSX.Element {
  useThemeClass()
  const { settings, update, reset } = useSettings()
  const info = useAppInfo()
  const [view, setView] = useState<ViewId>('scanner')
  const [reclaimed, setReclaimed] = useState(0)

  const platform = info?.platform ?? 'win32'

  const onReclaimed = useCallback((bytes: number) => {
    setReclaimed((current) => current + bytes)
  }, [])

  return (
    <TooltipProvider>
      <div className="flex h-full w-full overflow-hidden bg-surface-0">
        <Sidebar
          view={view}
          onChange={setView}
          reclaimedLabel={reclaimed > 0 ? formatBytes(reclaimed) : null}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <div className={cn('flex min-h-0 flex-1 flex-col', view !== 'scanner' && 'hidden')}>
            <ScannerView
              settings={settings}
              platform={platform}
              onReclaimed={onReclaimed}
              onOpenSettings={() => setView('settings')}
              onUpdateSettings={update}
            />
          </div>

          {view === 'settings' && (
            <SettingsView
              settings={settings}
              platform={platform}
              onUpdate={update}
              onReset={reset}
            />
          )}

          {view === 'about' && <AboutView info={info} platform={platform} />}
        </main>
      </div>
    </TooltipProvider>
  )
}
