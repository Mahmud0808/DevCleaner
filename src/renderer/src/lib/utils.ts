import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

export function formatBytes(bytes: number, decimals?: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const index = Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** index
  const precision = decimals ?? (index === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2)
  return `${value.toFixed(precision)} ${UNITS[index]}`
}

export function splitBytes(bytes: number): { value: string; unit: string } {
  const formatted = formatBytes(bytes)
  const [value, unit] = formatted.split(' ')
  return { value, unit }
}

export function formatCount(count: number): string {
  return new Intl.NumberFormat().format(count)
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms % 60_000) / 1000)
  return `${minutes}m ${seconds}s`
}

export function formatRelativeTime(epochMs: number): string {
  if (!epochMs) return 'unknown'
  const days = Math.floor((Date.now() - epochMs) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mo ago`
  return `${Math.floor(months / 12)} yr ago`
}

export function isUnder(path: string, ancestor: string): boolean {
  if (path === ancestor) return true
  const separator = ancestor.includes('\\') ? '\\' : '/'
  const prefix = ancestor.endsWith(separator) ? ancestor : ancestor + separator
  return path.startsWith(prefix)
}

export function shortenPath(path: string, maxSegments = 4): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  if (parts.length <= maxSegments) return path
  return `…${path.includes('\\') ? '\\' : '/'}${parts.slice(-maxSegments).join(path.includes('\\') ? '\\' : '/')}`
}
