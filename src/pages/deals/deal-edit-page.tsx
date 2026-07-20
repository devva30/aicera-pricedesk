import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { DealBuilder } from '@/components/deals/deal-builder'
import { useAuthStore } from '@/stores/auth-store'
import { fetchDealById, saveDeal } from '@/services/deals-service'
import { useDispatch } from 'react-redux'
import { updateDeal } from '@/store/deals-slice'
import { FileEdit, ArrowLeft, History, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Deal, DealVersion } from '@/types'

export function DealEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isQuoteEdit = location.pathname.startsWith('/quotes')
  const user = useAuthStore((s) => s.user)
  const dispatch = useDispatch()
  
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isApprovedEdit, setIsApprovedEdit] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (!id || !user) return
    const load = async () => {
      setLoading(true)
      try {
        const d = await fetchDealById(id)
        if (d) {
          // Check authorization: only creator (sales_rep) or admin can edit
          if (d.created_by !== user.id && user.role !== 'admin') {
            toast.error('You do not have permission to edit this deal')
            navigate(`${isQuoteEdit ? '/quotes' : '/deals'}/${id}`)
            return
          }
          // Check state: draft, changes_requested, rejected OR approved (new)
          const editableStatuses = ['draft', 'changes_requested', 'rejected', 'approved']
          if (!editableStatuses.includes(d.status)) {
            toast.error('Only drafts, change requests, rejected, or approved deals can be edited')
            navigate(`${isQuoteEdit ? '/quotes' : '/deals'}/${id}`)
            return
          }
          setIsApprovedEdit(d.status === 'approved')
          // If approved, show confirmation dialog before letting user edit
          if (d.status === 'approved') {
            setShowConfirm(true)
          }
          setDeal(d)
        } else {
          toast.error('Deal not found')
          navigate(isQuoteEdit ? '/quotes' : '/deals')
        }
      } catch (e) {
        console.error(e)
        toast.error('Failed to load deal')
        navigate(isQuoteEdit ? '/quotes' : '/deals')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, user, navigate])

  const handleSubmit = async (data: any, submitType: 'draft' | 'submit') => {
    setSaving(true)
    const isDraft = submitType === 'draft'
    try {
      // Build the version snapshot of the current approved deal
      const newVersions: DealVersion[] = [...(deal?.previous_versions ?? [])]

      if (isApprovedEdit && deal) {
        const versionSnapshot: DealVersion = {
          version_number: newVersions.length + 1,
          saved_at: new Date().toISOString(),
          saved_by: user.id,
          saved_by_name: user.full_name,
          status: deal.status,
          total_revenue: deal.total_revenue,
          total_cost: deal.total_cost,
          gross_margin_pct: deal.gross_margin_pct,
          net_margin_pct: deal.net_margin_pct,
          items: deal.items ?? [],
          overheads: deal.overheads ?? [],
          description: deal.description,
          title: deal.title,
        }
        newVersions.push(versionSnapshot)
      }

      // Build the versioned deal number for approved-deal re-edits
      // e.g. PD-2026-001029 → PD-2026-001029-v2 on second submission
      const baseDealNumber = deal?.deal_number?.replace(/-v\d+$/, '') ?? deal?.deal_number
      const versionedDealNumber =
        isApprovedEdit && !isDraft
          ? `${baseDealNumber}-v${newVersions.length + 1}`
          : deal?.deal_number

      const updated = await saveDeal(
        {
          ...data,
          id: id,
          deal_number: versionedDealNumber,
          status: isDraft ? 'draft' : (data.requires_technical ? 'pending_technical' : 'pending_finance'),
          previous_versions: newVersions,
          // Pass flag so deals-service can send the right notifications
          _isApprovedResubmit: isApprovedEdit && !isDraft,
          _versionNumber: newVersions.length + 1,
        },
        user.id
      )
      dispatch(updateDeal(updated))
      if (isDraft) {
        toast.success('Pricing request updated and saved as draft')
      } else {
        toast.success(
          isApprovedEdit
            ? 'Revised deal submitted for re-approval. Previous version saved for reference.'
            : data.requires_technical
              ? 'Pricing request resubmitted for Technical approval'
              : 'Pricing request resubmitted for Finance approval'
        )
      }
      navigate(`${isQuoteEdit ? '/quotes' : '/deals'}/${updated.id}`)
    } catch {
      toast.error(isDraft ? 'Failed to update pricing request' : 'Failed to resubmit pricing request')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    )
  }

  if (!deal) return null

  // Approved deal confirmation gate
  if (showConfirm) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <History className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Approved Deal — Edit & Resubmit</span>
            <h1 className="text-xl font-bold font-display text-foreground mt-0.5">{deal.deal_number}</h1>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-amber-900 text-sm">Edit Approved Deal?</h2>
              <p className="text-xs text-amber-800 mt-1.5 leading-relaxed">
                You are about to edit an <strong>approved deal</strong>. The current approved version will be 
                automatically <strong>saved as a reference snapshot</strong> before any changes are made.
                Once you submit your edits, the deal will re-enter the approval workflow from the beginning.
              </p>
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-md p-4 text-xs space-y-2">
            <p className="font-bold text-foreground uppercase tracking-wider text-[10px] mb-2">What will happen:</p>
            <div className="flex items-start gap-2">
              <span className="inline-block h-4 w-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold shrink-0 mt-0.5">1</span>
              <span className="text-muted-foreground">Current approved version will be <strong className="text-foreground">saved as Version {(deal.previous_versions?.length ?? 0) + 1}</strong> for reference</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="inline-block h-4 w-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold shrink-0 mt-0.5">2</span>
              <span className="text-muted-foreground">Deal status will change to <strong className="text-foreground">Draft</strong> while you make edits</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="inline-block h-4 w-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold shrink-0 mt-0.5">3</span>
              <span className="text-muted-foreground">After edits, you will re-submit for the full <strong className="text-foreground">approval pipeline</strong></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="inline-block h-4 w-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold shrink-0 mt-0.5">4</span>
              <span className="text-muted-foreground">Deal number will be updated to <strong className="text-foreground font-mono">{deal.deal_number?.replace(/-v\d+$/, '')}-v{(deal.previous_versions?.length ?? 0) + 2}</strong> and all reviewers will be notified</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`${isQuoteEdit ? '/quotes' : '/deals'}/${deal.id}`)}
              className="text-xs h-9 font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Cancel — Keep Approved
            </Button>
            <Button
              size="sm"
              onClick={() => setShowConfirm(false)}
              className="text-xs h-9 font-semibold bg-amber-600 hover:bg-amber-500 text-white"
            >
              <FileEdit className="h-3.5 w-3.5 mr-1.5" />
              Proceed to Edit
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Salesforce Workspace Highlight Header Panel */}
      <div className="bg-card border border-border rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`h-12 w-12 rounded flex items-center justify-center shrink-0 mt-0.5 ${isApprovedEdit ? 'bg-amber-100 text-amber-600' : 'bg-primary/10 text-primary'}`}>
              <FileEdit className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pricing Revision Portal</span>
                <Badge variant="warning" className="text-[9px] py-0 px-2 font-semibold">
                  {isApprovedEdit ? 'Revising Approved Deal' : 'Edit Proposal'} ({deal.deal_number})
                </Badge>
              </div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-foreground mt-0.5">
                {isApprovedEdit ? 'Edit & Resubmit Approved Deal' : 'Modify Pricing Proposal'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isApprovedEdit
                  ? 'The previous approved version will be preserved as a reference snapshot. Your changes will require re-approval.'
                  : 'Revise pricing worksheet configurations, adjust overhead charges, and resubmit for reviews.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isApprovedEdit && (
              <Badge className="text-[10px] py-1 px-2.5 bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                <History className="h-3 w-3 mr-1" />
                Creating v{(deal.previous_versions?.length ?? 0) + 2} — {deal.deal_number?.replace(/-v\d+$/, '')}-v{(deal.previous_versions?.length ?? 0) + 2}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="text-xs h-8">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Cancel & Back
            </Button>
          </div>
        </div>
      </div>

      {/* Reworked Deal Builder Form prefilled with initialDeal */}
      <DealBuilder initialDeal={deal} onSubmit={handleSubmit} isSubmitting={saving} />
    </div>
  )
}
