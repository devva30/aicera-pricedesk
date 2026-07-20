import { useState } from 'react'
import { Check, RotateCcw, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { canUserActOnDeal } from '@/lib/workflow'
import {
  approveDeal,
  rejectDeal,
  requestChanges,
  submitDealForApproval,
} from '@/services/deals-service'
import type { Deal, UserRole } from '@/types'

interface ApprovalActionsProps {
  deal: Deal
  userRole: UserRole
  userId: string
  onUpdate: (deal: Deal) => void
}

type ActionType = 'approve' | 'reject' | 'changes' | 'submit' | null

export function ApprovalActions({ deal, userRole, userId, onUpdate }: ApprovalActionsProps) {
  const [action, setAction] = useState<ActionType>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const canAct = canUserActOnDeal(userRole, deal.status)
  const isSalesRep = userRole === 'sales_rep' || userRole === 'admin'
  const canSubmit =
    isSalesRep && (deal.status === 'draft' || deal.status === 'changes_requested')

  const handleConfirm = async () => {
    if (!action) return
    if ((action === 'changes' || action === 'reject') && !comment.trim()) {
      toast.error(action === 'reject' ? 'Comment is required when rejecting a deal' : 'Comment is required when requesting changes')
      return
    }
    setLoading(true)
    try {
      let updated: Deal
      switch (action) {
        case 'submit':
          updated = await submitDealForApproval(deal.id, userId, comment)
          break
        case 'approve':
          updated = await approveDeal(
            deal.id,
            userId,
            deal.status,
            deal.requires_technical,
            comment
          )
          toast.success('Deal approved')
          break
        case 'reject':
          updated = await rejectDeal(deal.id, userId, comment)
          toast.success('Deal rejected')
          break
        case 'changes':
          updated = await requestChanges(deal.id, userId, comment)
          toast.success('Changes requested')
          break
        default:
          return
      }
      onUpdate(updated)
      setAction(null)
      setComment('')
    } catch {
      toast.error('Action failed')
    } finally {
      setLoading(false)
    }
  }

  const hasActions = canSubmit || (canAct && deal.status !== 'draft' && deal.status !== 'changes_requested')

  return (
    <div className="flex flex-col gap-4 w-full">
      {hasActions ? (
        <div className="flex flex-col gap-2 w-full">
          {canSubmit && (
            <Button onClick={() => setAction('submit')} className="bg-primary hover:bg-primary/95 text-white font-semibold h-10 px-5 w-full justify-center">
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}
          {canAct && deal.status !== 'draft' && deal.status !== 'changes_requested' && (
            <>
              <Button onClick={() => setAction('approve')} className="bg-primary hover:bg-primary/95 text-white font-semibold h-10 px-5 w-full justify-center">
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
              {deal.status === 'pending_sales_head' && (
                <Button variant="outline" onClick={() => setAction('changes')} className="border-border hover:bg-muted font-semibold h-10 px-5 w-full justify-center">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Request Changes
                </Button>
              )}
              <Button variant="destructive" onClick={() => setAction('reject')} className="bg-red-600 hover:bg-red-700 text-white font-semibold h-10 px-5 w-full justify-center">
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="text-xs space-y-3">
          {deal.status === 'approved' && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
              <Check className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Deal Fully Approved</p>
                <p className="mt-1 text-[11px] opacity-90">This pricing proposal is fully validated and ready for commercial contracting.</p>
              </div>
            </div>
          )}
          {deal.status === 'rejected' && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-red-800 dark:text-red-300 flex items-start gap-2.5">
              <X className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Deal Rejected</p>
                <p className="mt-1 text-[11px] opacity-90">This proposal has been rejected by reviewers and cannot advance further in the current pipeline state.</p>
              </div>
            </div>
          )}
          {deal.status === 'changes_requested' && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <RotateCcw className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Revision In Progress</p>
                <p className="mt-1 text-[11px] opacity-90">Awaiting Sales Rep modifications and resubmission. Only the owner can edit this draft.</p>
              </div>
            </div>
          )}
          {!['approved', 'rejected', 'changes_requested'].includes(deal.status) && (
            <div className="rounded-lg border border-border bg-muted/10 p-4 text-muted-foreground flex items-start gap-2.5">
              <Send className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-foreground">Pending Review Queue</p>
                <p className="mt-1 text-[11px] opacity-90">This proposal is currently routed and waiting for reviews at the active pipeline stage.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!action} onOpenChange={() => setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' && 'Approve Deal'}
              {action === 'reject' && 'Reject Deal'}
              {action === 'changes' && 'Request Changes'}
              {action === 'submit' && 'Submit for Approval'}
            </DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-xs font-semibold text-foreground">
              {(action === 'changes' || action === 'reject')
                ? <span>Comment <span className="text-destructive font-bold">*</span> <span className="text-muted-foreground font-normal">(required)</span></span>
                : 'Comment (optional)'}
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-2 text-xs"
              placeholder={
                action === 'approve'
                  ? 'Optional notes on approval compliance...'
                  : action === 'submit'
                  ? 'Optional note for reviewers...'
                  : action === 'reject'
                  ? 'Required — state the reason for rejection...'
                  : 'Required — describe what changes are needed...'
              }
              rows={4}
            />
            {action === 'submit' && (
              <p className="text-[11px] text-muted-foreground mt-2">
                This will route the deal to Finance for review.
              </p>
            )}
            {action === 'approve' && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Confirm approval to advance to the next stage.
              </p>
            )}
            {(action === 'reject' || action === 'changes') && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                <span className="font-bold">Note:</span> This comment will be visible to the Sales Rep.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
