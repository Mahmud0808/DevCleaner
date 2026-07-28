import { useEffect, useState } from 'react'
import type { AppInfo } from '@shared/types'

export function useAppInfo(): AppInfo | null {
  const [info, setInfo] = useState<AppInfo | null>(null)
  useEffect(() => {
    let alive = true
    void window.api.getAppInfo().then((value) => {
      if (alive) setInfo(value)
    })
    return () => {
      alive = false
    }
  }, [])
  return info
}
