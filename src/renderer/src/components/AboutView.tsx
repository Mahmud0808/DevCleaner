import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { CATEGORIES } from '@shared/rules'
import type { AppInfo } from '@shared/types'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { formatCount } from '@/lib/utils'

interface AboutViewProps {
  info: AppInfo | null
  platform: NodeJS.Platform
}

const TREE: Array<[string, string, 'marker' | 'listed' | 'kept']> = [
  ['photos/', '', 'kept'],
  ['└─ build/', 'no marker above it, never listed', 'kept'],
  ['', '', 'kept'],
  ['work/api/', '', 'kept'],
  ['├─ Cargo.toml', 'marker, Rust rules apply here and below', 'marker'],
  ['├─ target/', 'listed', 'listed'],
  ['└─ src/', 'kept', 'kept']
]

const GUARANTEES: Array<[string, string]> = [
  ['Never entered', '.git   .hg   .svn   node_modules'],
  ['Never removed', 'symlinks, junctions, drive roots, anything outside the scanned folder'],
  ['Checked twice', 'the marker rule while scanning, the path rule again in the main process'],
  ['On failure', 'the path and the reason are reported, and the remaining folders continue']
]

export function AboutView({ info, platform }: AboutViewProps): JSX.Element {
  const [settingsPath, setSettingsPath] = useState('')

  useEffect(() => {
    void window.api.getSettingsPath().then(setSettingsPath)
  }, [])

  const targetCount = CATEGORIES.reduce((sum, c) => sum + c.targets.length, 0)
  const markerCount = new Set(CATEGORIES.flatMap((c) => c.indicators)).size

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header
        className="drag-region flex h-12 shrink-0 items-center border-b border-line bg-surface-1 pl-6"
        style={{ paddingRight: platform === 'darwin' ? 16 : 146 }}
      >
        <h1 className="text-[13px] font-semibold text-content">About</h1>
      </header>

      <div className="scroller min-h-0 flex-1 px-6 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          <section className="rounded-xl border border-line bg-surface-1 px-5 py-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-content">
                Dev Cleaner
              </h2>
              <span className="num text-[12px] text-content-subtle">
                {info?.version ?? '-'}
              </span>
            </div>
            <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-content-muted">
              Finds regenerable build output, caches and dependency folders inside real projects,
              measures every one of them, and removes only what you check.
            </p>

            <div className="mt-4 flex gap-8 border-t border-line pt-3.5">
              <Metric value={formatCount(CATEGORIES.length)} label="project types" />
              <Metric value={formatCount(targetCount)} label="folder names" />
              <Metric value={formatCount(markerCount)} label="marker files" />
            </div>

            <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5">
              {CATEGORIES.map((category) => (
                <span key={category.id} className="flex items-baseline gap-1.5">
                  <span
                    className="translate-y-[-1px] h-[7px] w-[7px] rounded-[2px]"
                    style={{ backgroundColor: category.accent }}
                  />
                  <span className="text-[11.5px] text-content-muted">{category.label}</span>
                </span>
              ))}
            </div>
          </section>

          <Panel title="How a folder is chosen">
            <div className="px-4 py-3.5">
              {TREE.map(([left, right, kind], index) =>
                left === '' ? (
                  <div key={index} className="h-2" />
                ) : (
                  <div
                    key={index}
                    className="flex items-baseline gap-5 py-[3px] font-mono text-[12px]"
                  >
                    <span
                      className={cn(
                        'w-[168px] shrink-0 truncate',
                        kind === 'listed' ? 'text-content' : 'text-content-muted'
                      )}
                    >
                      {left}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 text-[11.5px]',
                        kind === 'listed' ? 'text-brand' : 'text-content-subtle'
                      )}
                    >
                      {right}
                    </span>
                  </div>
                )
              )}
            </div>
          </Panel>

          <Panel title="Guarantees">
            {GUARANTEES.map(([label, value]) => (
              <Row key={label} label={label}>
                <span className="font-mono text-[11.5px] leading-5 text-content-muted">{value}</span>
              </Row>
            ))}
          </Panel>

          <Panel title="Preferences">
            <Row label="Stored at">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="selectable break-all font-mono text-[11.5px] leading-5 text-content-muted">
                  {settingsPath || '-'}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={!settingsPath}
                  onClick={() => void window.api.revealPath(settingsPath)}
                >
                  Show
                </Button>
              </div>
            </Row>
          </Panel>

          <Panel title="Runtime">
            {(
              [
                ['Electron', info?.electron],
                ['Chromium', info?.chrome],
                ['Node', info?.node],
                ['Platform', info?.platform]
              ] as Array<[string, string | undefined]>
            ).map(([label, value]) => (
              <Row key={label} label={label}>
                <span className="num text-[12px] leading-5 text-content">{value ?? '-'}</span>
              </Row>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Metric({ value, label }: { value: string; label: string }): JSX.Element {
  return (
    <div>
      <p className="num text-[17px] font-semibold leading-none text-content">{value}</p>
      <p className="mt-1 text-[11px] text-content-subtle">{label}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-content-subtle">
        {title}
      </h3>
      <div className="mt-2.5 overflow-hidden rounded-xl border border-line bg-surface-1">
        {children}
      </div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex items-baseline gap-6 px-4 py-3 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line">
      <p className="w-[7.5rem] shrink-0 text-[12.5px] font-medium leading-5 text-content">
        {label}
      </p>
      <div className="min-w-0 flex-1 leading-5">{children}</div>
    </div>
  )
}
