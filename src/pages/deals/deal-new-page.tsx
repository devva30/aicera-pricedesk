import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { DealBuilder } from '@/components/deals/deal-builder'
import { useAuthStore } from '@/stores/auth-store'
import { saveDeal } from '@/services/deals-service'
import { useDispatch } from 'react-redux'
import { addDeal } from '@/store/deals-slice'
import { FileText, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function DealNewPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const dispatch = useDispatch()
  const [saving, setSaving] = useState(false)
  const userId = user?.id ?? 'demo-sales'

  const handleSubmit = async (data: any, submitType: 'draft' | 'submit') => {
    setSaving(true)
    const isDraft = submitType === 'draft'
    try {
      const deal = await saveDeal(
        {
          title: data.title,
          customer_name: data.customer_name,
          customer_id: data.customer_id,
          description: data.description,
          currency: data.currency,
          oem: data.oem || null,
          quote_number: data.quote_number || null,
          requires_technical: data.requires_technical,
          status: isDraft ? 'draft' : (data.requires_technical ? 'pending_technical' : 'pending_finance'),
          items: data.items,
          overheads: data.overheads,
        },
        userId
      )
      dispatch(addDeal(deal))
      if (isDraft) {
        toast.success('Pricing request saved as draft')
      } else {
        toast.success(data.requires_technical ? 'Pricing request submitted for Technical approval' : 'Pricing request submitted for Finance approval')
      }
      navigate(`/deals/${deal.id}`)
    } catch {
      toast.error(isDraft ? 'Failed to save pricing request' : 'Failed to submit pricing request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Salesforce Workspace Highlight Header Panel */}
      <div className="bg-card border border-border rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pricing Request Portal</span>
                <Badge variant="default" className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/5 text-[9px] py-0 px-2 font-semibold">
                  New Pricing Request
                </Badge>
              </div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-foreground mt-0.5">
                Create Pricing Request
              </h1>

            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="text-xs h-8">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Cancel & Back
            </Button>
          </div>
        </div>
      </div>

      {/* Reworked Deal Builder Form */}
      <DealBuilder onSubmit={handleSubmit} isSubmitting={saving} />
    </div>
  )
}
