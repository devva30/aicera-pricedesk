import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export { DEFAULT_CURRENCY, formatCurrency, formatCurrencyCompact } from '@/lib/currency'

export function formatPercent(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '0.00%'
  }
  return `${Number(value).toFixed(decimals)}%`
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return 'N/A'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'N/A'
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatRelative(date: string | undefined | null): string {
  if (!date) return 'N/A'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'N/A'
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

export type MarginTier = 'success' | 'danger'

export function getMarginTier(pct: number | undefined | null): MarginTier {
  if ((pct ?? 0) >= 8) return 'success'
  return 'danger'
}

export function getMarginColor(pct: number | undefined | null): string {
  const tier = getMarginTier(pct)
  if (tier === 'success') return 'text-emerald-500'
  return 'text-red-500'
}

export function getMarginBg(pct: number | undefined | null): string {
  const tier = getMarginTier(pct)
  if (tier === 'success') return 'bg-emerald-500/10 border-emerald-500/20'
  return 'bg-red-500/10 border-red-500/20'
}
