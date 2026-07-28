import { useCallback, useEffect, useState } from 'react'
import type { Settings } from '@shared/types'

export interface UseSettings {
  settings: Settings | null
  update: (patch: Partial<Settings>) => Promise<void>
  reset: () => Promise<void>
  saving: boolean
}

export function useSettings(): UseSettings {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    void window.api.getSettings().then((loaded) => {
      if (alive) setSettings(loaded)
    })
    return () => {
      alive = false
    }
  }, [])

  const update = useCallback(async (patch: Partial<Settings>) => {
    setSaving(true)
    setSettings((current) => (current ? { ...current, ...patch } : current))
    try {
      const saved = await window.api.saveSettings(patch)
      setSettings(saved)
    } finally {
      setSaving(false)
    }
  }, [])

  const reset = useCallback(async () => {
    setSaving(true)
    try {
      setSettings(await window.api.resetSettings())
    } finally {
      setSaving(false)
    }
  }, [])

  return { settings, update, reset, saving }
}
