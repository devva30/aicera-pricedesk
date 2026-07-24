import { useEffect, useState } from 'react'
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Deal } from '@/types'

interface SlaTimerProps {
  deal: Deal
  targetHours?: number
  compact?: boolean
}

export function SlaTimer({ deal, targetHours = 24, compact = false }: SlaTimerProps) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])

  const pendingStatuses = ['pending_technical', 'pending_finance', 'pending_sales_head']
  if (!pendingStatuses.includes(deal.status)) {
    return null
  }

  const startTimeStr = deal.submitted_at || deal.created_at || deal.updated_at
  const startTime = new Date(startTimeStr).getTime()
  const targetMs = targetHours * 3600 * 1000
  const deadline = startTime + targetMs
  const diffMs = deadline - now

  const isBreached = diffMs <= 0
  const absMs = Math.abs(diffMs)

  const hours = Math.floor(absMs / (1000 * 60 * 60))
  const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60))

  if (isBreached) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] bg-rose-500/10 text-rose-600 border border-rose-500/20 animate-pulse",
          compact ? "text-[9px] px-1.5" : ""
        )}
        title={`Approval SLA breached by ${hours}h ${minutes}m! Target response time was ${targetHours} hours.`}
      >
        <AlertCircle className="h-3 w-3 shrink-0 text-rose-600" />
        <span>SLA Breached ({hours}h {minutes}m)</span>
      </div>
    )
  }

  const isWarning = hours < 8

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] border",
        isWarning
          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
          : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        compact ? "text-[9px] px-1.5" : ""
      )}
      title={`Approval SLA: ${hours}h ${minutes}m remaining before target ${targetHours}h deadline.`}
    >
      {isWarning ? (
        <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
      ) : (
        <Clock className="h-3 w-3 shrink-0 text-emerald-500" />
      )}
      <span>{hours}h {minutes}m SLA</span>
    </div>
  )
}
