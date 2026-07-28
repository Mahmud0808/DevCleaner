import { useEffect, useState } from 'react'

export function useThemeClass(): 'dark' | 'light' {
  const [resolved, setResolved] = useState<'dark' | 'light'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )

  useEffect(() => {
    const apply = (theme: 'dark' | 'light'): void => {
      document.documentElement.classList.toggle('dark', theme === 'dark')
      document.documentElement.style.colorScheme = theme
      setResolved(theme)
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    apply(media.matches ? 'dark' : 'light')

    const onMedia = (event: MediaQueryListEvent): void => apply(event.matches ? 'dark' : 'light')
    media.addEventListener('change', onMedia)
    const off = window.api.onThemeChanged(apply)

    return () => {
      media.removeEventListener('change', onMedia)
      off()
    }
  }, [])

  return resolved
}
