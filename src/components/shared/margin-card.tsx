import { motion } from 'framer-motion'
import { cn, formatCurrency, formatPercent, getMarginBg, getMarginColor } from '@/lib/utils'

interface MarginCardProps {
  label: string
  value: number
  isPercent?: boolean
  currency?: string
  size?: 'sm' | 'md' | 'lg'
}

export function MarginCard({
  label,
  value,
  isPercent = false,
  currency = 'INR',
  size = 'md',
}: MarginCardProps) {
  const display = isPercent ? formatPercent(value) : formatCurrency(value, currency)
  const colorClass = isPercent ? getMarginColor(value) : ''
  const bgClass = isPercent ? getMarginBg(value) : 'bg-muted/30 border-border'

  return (
    <motion.div
      layout
      className={cn(
        'rounded-xl border p-4',
        bgClass,
        size === 'lg' && 'p-6',
        size === 'sm' && 'p-3'
      )}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p
        className={cn(
          'font-bold font-display tracking-tight',
          colorClass,
          size === 'lg' ? 'text-3xl mt-2' : size === 'sm' ? 'text-lg mt-1' : 'text-2xl mt-1.5'
        )}
      >
        {display}
      </p>
    </motion.div>
  )
}
