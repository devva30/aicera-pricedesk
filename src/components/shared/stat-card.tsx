import { motion } from 'framer-motion'
import { type LucideIcon, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface StatCardProps {
  title: string
  value: string
  change?: number
  icon: LucideIcon
  loading?: boolean
  className?: string
  valueColor?: string
  /** Shown on hover when the displayed value is abbreviated */
  valueTitle?: string
}

function getValueSizeClass(value: string): string {
  const len = value.length
  if (len > 16) return 'text-base leading-snug'
  if (len > 12) return 'text-lg leading-snug'
  if (len > 9) return 'text-xl leading-tight'
  return 'text-2xl leading-tight'
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  loading,
  className,
  valueColor,
  valueTitle,
}: StatCardProps) {
  if (loading) {
    return (
      <div className={cn('rounded-xl border border-border/80 bg-card p-5 shadow-sm', className)}>
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-7 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    )
  }

  const isPositive = change !== undefined && change >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/80 bg-card p-5 shadow-sm',
        'hover:shadow-md transition-shadow',
        className
      )}
    >
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
            {title}
          </p>
          <p
            title={valueTitle ?? value}
            className={cn(
              'mt-1.5 font-bold tracking-tight font-display tabular-nums break-words',
              getValueSizeClass(value),
              valueColor
            )}
          >
            {value}
          </p>
          {change !== undefined && (
            <div
              className={cn(
                'mt-2 flex items-center gap-1 text-[11px] font-medium',
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3 shrink-0" />
              ) : (
                <TrendingDown className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate">{Math.abs(change)}% vs last month</span>
            </div>
          )}
        </div>
        <div className="shrink-0 rounded-lg bg-primary/10 p-2.5 text-primary border border-primary/10">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  )
}
