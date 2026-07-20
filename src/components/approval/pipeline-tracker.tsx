import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isStageActive, isStageComplete } from '@/lib/workflow'
import { type DealStatus } from '@/types'

interface PipelineTrackerProps {
  currentStatus: DealStatus
  requiresTechnical: boolean
  compact?: boolean
}

const STAGE_CONFIG: { status: DealStatus; label: string; optional?: boolean }[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'pending_technical', label: 'Tech Review', optional: true },
  { status: 'pending_finance', label: 'Finance Review' },
  { status: 'pending_sales_head', label: 'Sales Head' },
  { status: 'approved', label: 'Approved' },
]

export function PipelineTracker({
  currentStatus,
  requiresTechnical,
  compact = false,
}: PipelineTrackerProps) {
  const stages = STAGE_CONFIG.filter((s) => !s.optional || requiresTechnical)
  const isRejected = currentStatus === 'rejected'
  const isChanges = currentStatus === 'changes_requested'

  return (
    <div className="w-full">
      <div className={cn(
        "flex flex-row items-stretch rounded border border-border bg-muted/30 p-0.5 overflow-hidden",
        compact ? "h-8" : "h-10"
      )}>
        {stages.map((stage, index) => {
          const complete = isStageComplete(stage.status, currentStatus, requiresTechnical)
          const active = isStageActive(stage.status, currentStatus)

          let bgClass = "bg-muted text-muted-foreground"
          
          if (complete) {
            bgClass = "bg-emerald-600 dark:bg-emerald-700 text-white"
          } else if (active) {
            if (isRejected) {
              bgClass = "bg-red-600 dark:bg-red-700 text-white"
            } else if (isChanges) {
              bgClass = "bg-amber-600 dark:bg-amber-700 text-white"
            } else {
              bgClass = "bg-primary text-primary-foreground font-semibold"
            }
          }

          const isFirst = index === 0
          const isLast = index === stages.length - 1

          const clipPathStyle = {
            clipPath: isFirst
              ? 'polygon(0% 0%, 93% 0%, 100% 50%, 93% 100%, 0% 100%)'
              : isLast
              ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 7% 50%)'
              : 'polygon(0% 0%, 93% 0%, 100% 50%, 93% 100%, 0% 100%, 7% 50%)'
          }

          return (
            <div
              key={stage.status}
              style={clipPathStyle}
              className={cn(
                "relative flex-1 flex items-center justify-center text-xs font-medium transition-all select-none px-2",
                bgClass,
                index > 0 ? "-ml-2.5" : ""
              )}
            >
              <div className="flex items-center gap-1 z-10 pl-2">
                {complete && <Check className="h-3 w-3 shrink-0" />}
                {active && (isRejected || isChanges) && <X className="h-3 w-3 shrink-0" />}
                <span className="truncate max-w-[120px]">{stage.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {(isRejected || isChanges) && !compact && (
        <div
          className={cn(
            "mt-3 flex items-center gap-2 rounded px-4 py-2.5 text-sm font-medium",
            isRejected
              ? "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
          )}
        >
          <X className="h-4 w-4 shrink-0" />
          <span>
            {isRejected
              ? "This deal has been rejected by reviewers. Please see feedback below."
              : "Changes have been requested on this deal. Check feedback and resubmit."}
          </span>
        </div>
      )}
    </div>
  )
}
