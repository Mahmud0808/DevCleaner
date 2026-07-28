import type { DevCleanerApi } from './index'

declare global {
  interface Window {
    api: DevCleanerApi
  }
}

export {}
