import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Monitor, Moon, Plus, RotateCcw, ShieldOff, Sun, X } from 'lucide-react'
import { CATEGORIES } from '@shared/rules'
import type { Settings, ThemePreference } from '@shared/types'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

interface SettingsViewProps {
  settings: Settings | null
  platform: NodeJS.Platform
  onUpdate: (patch: Partial<Settings>) => Promise<void>
  onReset: () => Promise<void>
}

const THEMES: Array<{ id: ThemePreference; label: string; icon: typeof Sun }> = [
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'light', label: 'Light', icon: Sun }
]

export function SettingsView({
  settings,
  platform,
  onUpdate,
  onReset
}: SettingsViewProps): JSX.Element {
  const [ignoredDraft, setIgnoredDraft] = useState('')

  useEffect(() => {
    if (settings) setIgnoredDraft(settings.ignoredNames.join(', '))
  }, [settings?.ignoredNames.join(',')])

  if (!settings) {
    return (
      <div className="flex flex-1 items-center justify-center text-[12.5px] text-content-muted">
        Loading
      </div>
    )
  }

  const categoryState = (categoryId: string): { enabled: boolean; targets: Record<string, boolean> } =>
    settings.categories[categoryId] ?? { enabled: true, targets: {} }

  const setCategoryEnabled = (categoryId: string, enabled: boolean): void => {
    void onUpdate({
      categories: {
        ...settings.categories,
        [categoryId]: { ...categoryState(categoryId), enabled }
      }
    })
  }

  const setTargetEnabled = (categoryId: string, targetId: string, enabled: boolean): void => {
    const category = categoryState(categoryId)
    void onUpdate({
      categories: {
        ...settings.categories,
        [categoryId]: { ...category, targets: { ...category.targets, [targetId]: enabled } }
      }
    })
  }

  const enabledCount = CATEGORIES.filter((c) => settings.categories[c.id]?.enabled).length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header
        className="drag-region flex h-12 shrink-0 items-center border-b border-line bg-surface-1 pl-6"
        style={{ paddingRight: platform === 'darwin' ? 16 : 146 }}
      >
        <h1 className="text-[13px] font-semibold text-content">Settings</h1>
        <p className="ml-3 text-[11.5px] text-content-subtle">
          {enabledCount} of {CATEGORIES.length} project types on, saved as you change them
        </p>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => void onReset()}>
          <RotateCcw className="h-3.5 w-3.5" />
          Restore defaults
        </Button>
      </header>

      <div className="scroller min-h-0 flex-1 px-6 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          <Group title="Appearance">
            <Row label="Theme" hint="Follow the system setting or pin one.">
              <div className="flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
                {THEMES.map((theme) => {
                  const Icon = theme.icon
                  const active = settings.theme === theme.id
                  return (
                    <button
                      key={theme.id}
                      onClick={() => void onUpdate({ theme: theme.id })}
                      className={cn(
                        'flex items-center gap-1.5 rounded-[7px] px-2.5 py-[5px] text-[12px] font-medium transition-colors duration-[140ms]',
                        active
                          ? 'bg-surface-1 text-content'
                          : 'text-content-muted hover:text-content'
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5', active && 'text-brand')} />
                      {theme.label}
                    </button>
                  )
                })}
              </div>
            </Row>
          </Group>

          <Group title="Deleting">
            <Row
              label="Move to trash"
              hint="Recoverable, but far slower on folders the size of node_modules."
            >
              <Switch
                checked={settings.useTrash}
                onCheckedChange={(v) => void onUpdate({ useTrash: v })}
              />
            </Row>
            <Row
              label="Confirm first"
              hint="Shows the largest folders and the space they free before anything is removed."
            >
              <Switch
                checked={settings.confirmBeforeDelete}
                onCheckedChange={(v) => void onUpdate({ confirmBeforeDelete: v })}
              />
            </Row>
          </Group>

          <Group title="Scanning">
            <Row
              label="Hidden folders"
              hint="Required to find .venv, .gradle, .next and other dot folders."
            >
              <Switch
                checked={settings.scanHiddenDirs}
                onCheckedChange={(v) => void onUpdate({ scanHiddenDirs: v })}
              />
            </Row>
            <Row
              label="Follow symlinks"
              hint="Lets the scan leave the folder you picked and risks link loops."
            >
              <Switch
                checked={settings.followSymlinks}
                onCheckedChange={(v) => void onUpdate({ followSymlinks: v })}
              />
            </Row>
            <Row label="Maximum depth" hint="Folder levels to descend below the folder you pick.">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={settings.maxDepth}
                  onChange={(e) => void onUpdate({ maxDepth: Number(e.target.value) })}
                  className="h-1 w-44 cursor-pointer appearance-none rounded-full bg-surface-3 accent-brand"
                />
                <span className="num w-5 text-right text-[12.5px] text-content">
                  {settings.maxDepth}
                </span>
              </div>
            </Row>
            <Row
              label="Never enter"
              hint="Folder names, separated by commas. Version control folders such as .git are always skipped."
            >
              <input
                value={ignoredDraft}
                onChange={(e) => setIgnoredDraft(e.target.value)}
                onBlur={() =>
                  void onUpdate({
                    ignoredNames: ignoredDraft
                      .split(',')
                      .map((n) => n.trim())
                      .filter(Boolean)
                  })
                }
                placeholder="archive, legacy"
                className="h-8 w-72 rounded-lg border border-line bg-surface-1 px-2.5 font-mono text-[12px] text-content transition-colors placeholder:text-content-subtle focus:border-line-strong focus:outline-none"
              />
            </Row>
          </Group>

          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-content-subtle">
              Protected paths
            </h2>
            <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-content-muted">
              Nothing at or below these paths is ever listed or deleted. Right-click any row in the
              results to add one.
            </p>

            <div className="mt-2.5 overflow-hidden rounded-xl border border-line bg-surface-1">
              {settings.protectedPaths.length === 0 ? (
                <p className="px-4 py-3 text-[12px] text-content-subtle">Nothing is protected yet.</p>
              ) : (
                settings.protectedPaths.map((path, index) => (
                  <div
                    key={path}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5',
                      index > 0 && 'border-t border-line'
                    )}
                  >
                    <ShieldOff className="h-3.5 w-3.5 shrink-0 text-content-subtle" />
                    <span className="selectable min-w-0 flex-1 truncate font-mono text-[11.5px] text-content-muted">
                      {path}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Stop protecting ${path}`}
                      onClick={() =>
                        void onUpdate({
                          protectedPaths: settings.protectedPaths.filter((p) => p !== path)
                        })
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              className="mt-2.5"
              onClick={async () => {
                const picked = await window.api.pickFolder('Choose a folder to protect')
                if (picked && !settings.protectedPaths.includes(picked)) {
                  void onUpdate({ protectedPaths: [...settings.protectedPaths, picked] })
                }
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add folder
            </Button>
          </section>

          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-content-subtle">
              Project types
            </h2>
            <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-content-muted">
              A type applies only inside folders that hold one of its marker files. Switch a type
              off to ignore it completely, or turn off single folder names to keep those everywhere.
            </p>

            <div className="mt-3.5 overflow-hidden rounded-xl border border-line bg-surface-1">
              {CATEGORIES.map((category, index) => {
                const state = settings.categories[category.id]
                const enabled = state?.enabled ?? true
                const targetOn = (id: string): boolean => state?.targets?.[id] ?? true
                const activeTargets = category.targets.filter((t) => targetOn(t.id)).length
                return (
                  <section
                    key={category.id}
                    className={cn(index > 0 && 'border-t border-line')}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span
                        className="h-[9px] w-[9px] shrink-0 rounded-[2px]"
                        style={{ backgroundColor: category.accent, opacity: enabled ? 1 : 0.35 }}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'text-[13px] font-semibold',
                            enabled ? 'text-content' : 'text-content-muted'
                          )}
                        >
                          {category.label}
                        </p>
                        <p className="truncate font-mono text-[11px] text-content-subtle">
                          {category.global
                            ? 'applies everywhere, no marker needed'
                            : category.indicators.join('  ')}
                        </p>
                      </div>
                      <span className="num shrink-0 text-[11px] text-content-subtle">
                        {activeTargets}/{category.targets.length}
                      </span>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) => setCategoryEnabled(category.id, v)}
                        aria-label={`Enable ${category.label}`}
                      />
                    </div>

                    {enabled && (
                      <div className="flex flex-wrap gap-1.5 px-4 pb-3.5">
                        {category.targets.map((target) => {
                          const on = targetOn(target.id)
                          return (
                            <Tooltip
                              key={target.id}
                              content={
                                target.caution ? (
                                  <>
                                    <span className="block">{target.hint}</span>
                                    <span className="mt-1 block text-warn">{target.caution}</span>
                                    {target.defaultEnabled === false && (
                                      <span className="mt-1 block text-content-subtle">
                                        Off by default. Turn it on to include it in scans.
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  target.hint
                                )
                              }
                            >
                              <button
                                aria-pressed={on}
                                onClick={() => setTargetEnabled(category.id, target.id, !on)}
                                className={cn(
                                  'flex items-center gap-1.5 rounded-md border px-2 py-[3px] font-mono text-[11.5px] transition-colors duration-[140ms]',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1',
                                  on
                                    ? 'border-line-strong bg-surface-3 text-content'
                                    : 'border-line text-content-subtle line-through hover:text-content-muted'
                                )}
                              >
                                {target.caution && on && (
                                  <AlertTriangle className="h-3 w-3 text-warn" />
                                )}
                                {target.label}
                              </button>
                            </Tooltip>
                          )
                        })}
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-content-subtle">
        {title}
      </h2>
      <div className="mt-2.5 overflow-hidden rounded-xl border border-line bg-surface-1">
        {children}
      </div>
    </section>
  )
}

function Row({
  label,
  hint,
  children
}: {
  label: string
  hint: string
  children: ReactNode
}): JSX.Element {
  return (
    <div className="flex items-center gap-6 px-4 py-3 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-content">{label}</p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-content-muted">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
