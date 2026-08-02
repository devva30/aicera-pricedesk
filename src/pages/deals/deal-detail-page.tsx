import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Printer, User, Building, Landmark, Percent, CheckSquare, Coins, ListCollapse, Clock, Share2, FileDown, Check, History, FileEdit, Package, FileText, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PipelineTracker } from '@/components/approval/pipeline-tracker'
import { ApprovalActions } from '@/components/deals/approval-actions'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth-store'
import { SlaTimer } from '@/components/shared/sla-timer'
import { fetchDealAudit, fetchDealById, fetchQuotesByDealId, deleteDeal, deleteQuote } from '@/services/deals-service'
import { updateDeal, removeDeal } from '@/store/deals-slice'
import { Fragment } from 'react'
import { DEAL_STATUS_LABELS, type Deal, type DealAudit, type DealVersion, type BOMItem } from '@/types'
import { cn, formatCurrency, formatPercent, formatDate, formatRelative, getMarginColor } from '@/lib/utils'
import { pdf } from '@react-pdf/renderer'
import { QuotePDFDocument } from '@/components/deals/PDFDocument'
import { SignaturePad } from '@/components/deals/signature-pad'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const DEAL_STATUS_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "danger" | "outline"> = {
  draft: 'secondary',
  pending_technical: 'warning',
  pending_finance: 'warning',
  pending_sales_head: 'warning',
  approved: 'success',
  rejected: 'danger',
  changes_requested: 'warning',
}

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isQuoteView = location.pathname.startsWith('/quotes')
  const user = useAuthStore((s) => s.user)
  const dispatch = useDispatch()
  const storeDeals = useSelector((s: any) => s.deals.deals as Deal[])
  const dealFromStore = storeDeals.find((d) => d.id === id || d.deal_number === id || d.quote_number === id) ?? null
  const [deal, setDeal] = useState<Deal | null>(dealFromStore)
  const [audit, setAudit] = useState<DealAudit[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'overheads' | 'quotes'>('details')
  const [copied, setCopied] = useState(false)
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const [childQuotes, setChildQuotes] = useState<Deal[]>([])
  const [showAllAudit, setShowAllAudit] = useState(false)
  const [isSigPadOpen, setIsSigPadOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteItem = async () => {
    if (!deal) return
    setIsDeleting(true)
    try {
      if (isQuoteView) {
        await deleteQuote(deal.id, user.id)
        toast.success(`Quote ${deal.deal_number || deal.title} deleted successfully`)
        navigate('/quotes')
      } else {
        await deleteDeal(deal.id, user.id)
        dispatch(removeDeal(deal.id))
        toast.success(`Deal ${deal.deal_number || deal.title} deleted successfully`)
        navigate('/deals')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete item')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }


  useEffect(() => {
    import('@/services/targets-service').then(m => m.fetchSettings()).then(setSettings).catch(() => { })
  }, [])

  useEffect(() => {
    if (!id) return
    const load = async (retries = 3) => {
      if (!deal) setLoading(true)
      try {
        const [d, a, qs] = await Promise.all([
          fetchDealById(id),
          fetchDealAudit(id).catch((err) => {
            console.error('Failed to load deal audit trail:', err)
            return []
          }),
          (!isQuoteView ? fetchQuotesByDealId(id, dealFromStore || deal) : Promise.resolve([])).catch((err) => {
            console.error('Failed to load child quotes:', err)
            return []
          })
        ])
        const finalDeal = d || dealFromStore || deal
        if (!finalDeal && retries > 0) {
          // Firestore may not have committed the write yet — retry after a short delay
          console.warn(`Deal not found on attempt, retrying... (${retries} left)`)
          setTimeout(() => load(retries - 1), 800)
          return
        }
        if (finalDeal) {
          setDeal(finalDeal)
          dispatch(updateDeal(finalDeal))
        } else if (!deal) {
          setDeal(null)
        }
        setAudit(a)
        if (!isQuoteView && finalDeal && qs.length === 0) {
          const resolvedQuotes = await fetchQuotesByDealId(id, finalDeal)
          setChildQuotes(resolvedQuotes)
        } else {
          setChildQuotes(qs)
        }
      } catch (err) {
        console.error('Failed to load deal details:', err)
        toast.error('Failed to load deal details. Check database indexes.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, dispatch])

  const handleUpdate = async (updated: Deal) => {
    setDeal(updated)
    dispatch(updateDeal(updated))
    toast.success(`Status: ${DEAL_STATUS_LABELS[updated.status]}`)
    try {
      const a = await fetchDealAudit(updated.id)
      setAudit(a)
    } catch (e: any) {
      console.error('Failed to reload audit timeline:', e)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[400px] lg:col-span-2 rounded-lg" />
          <Skeleton className="h-[400px] rounded-lg" />
        </div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="text-center py-16 bg-card border border-border rounded-lg shadow-sm">
        <p className="text-muted-foreground font-medium">Deal not found</p>
        <Button variant="link" onClick={() => navigate(isQuoteView ? '/quotes' : '/deals')} className="mt-2 text-primary font-semibold">
          Back to list
        </Button>
      </div>
    )
  }

  const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
    approved: 'success',
    rejected: 'danger',
    changes_requested: 'warning',
    draft: 'default',
  }


  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: deal?.title, text: `Pricing Deal: ${deal?.deal_number}`, url })
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadPDF = async () => {
    if (!deal) return
    const toastId = toast.loading('Generating PDF proposal...')
    try {
      const blob = await pdf(<QuotePDFDocument deal={deal} settings={settings} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Proposal_${deal.quote_number || deal.deal_number}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded successfully!', { id: toastId })
    } catch (err: any) {
      console.error('PDF Generation Error:', err)
      const errMsg = String(err?.message || err)
      if (errMsg.includes('WebAssembly') || errMsg.includes('unsafe-eval') || errMsg.includes('CompileError')) {
        toast.dismiss(toastId)
        toast.info('Mobile browser blocked PDF engine. Opening print/PDF layout...', { duration: 3000 })
        window.print()
      } else {
        toast.error(`Failed to generate PDF: ${errMsg}`, { id: toastId })
      }
    }
  }

  const handlePrintPDF = async () => {
    if (!deal) return
    const toastId = toast.loading('Preparing PDF for printing...')
    try {
      const blob = await pdf(<QuotePDFDocument deal={deal} settings={settings} />).toBlob()
      const url = URL.createObjectURL(blob)
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      iframe.src = url
      document.body.appendChild(iframe)
      iframe.onload = () => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        toast.success('Print dialog opened successfully!', { id: toastId })
        setTimeout(() => {
          document.body.removeChild(iframe)
          URL.revokeObjectURL(url)
        }, 1000)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to print PDF: ${err.message || err}`, { id: toastId })
    }
  }

  const handleExportCSV = () => {
    if (!deal) return
    const rows = [
      ['Deal Number', 'Title', 'Customer', 'Status', 'Total Revenue', 'Total Cost', 'Net Margin %'],
      [deal.deal_number, deal.title, deal.customer_name, deal.status, deal.total_revenue, deal.total_cost, ((deal.net_margin_pct ?? 0) || 0).toFixed(2)],
      [],
      ['SKU', 'Product Name', 'Qty', 'UoM', 'Transfer Price', 'Quoted Price'],
      ...(deal.items ?? []).map((i) => [i.sku, i.product_name, i.quantity, i.unit_of_measure, i.transfer_price, i.quoted_price]),
    ]
    const csv = rows.map((r) => r.map(String).map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Export_${deal.quote_number || deal.deal_number}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('CSV exported successfully!')
  }

  const handleSaveSignature = (sigBase64: string) => {
    if (!deal) return
    const updatedDeal = { ...deal, signature_base64: sigBase64 }
    setDeal(updatedDeal)
    dispatch(updateDeal(updatedDeal))
    toast.success('Signature applied to quote!')
  }


  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[400px] lg:col-span-2 rounded-lg" />
          <Skeleton className="h-[400px] rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:p-0 print-scale">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm !important;
          }
          
          html, body {
            background: white !important;
            color: black !important;
            font-size: 11px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-scale {
            zoom: 0.82 !important;
          }

          /* Override tailwind gaps and paddings for super compact print */
          .print-scale .space-y-6 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 10px !important;
          }
          .print-scale .space-y-4 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 8px !important;
          }
          .print-scale .p-6 {
            padding: 12px !important;
          }
          .print-scale .pt-6 {
            padding-top: 10px !important;
          }
          .print-scale .pb-4 {
            padding-bottom: 8px !important;
          }
          .print-scale .mt-6 {
            margin-top: 10px !important;
          }
          .print-scale .py-3 {
            padding-top: 4px !important;
            padding-bottom: 4px !important;
          }
          .print-scale table th {
            padding-bottom: 4px !important;
          }
          .print-scale table td {
            padding-top: 4px !important;
            padding-bottom: 4px !important;
          }

          /* Page breaks inside tables should be avoided */
          tr, td, th {
            page-break-inside: avoid !important;
          }
          
          /* Remove shadow borders */
          .print-scale .shadow-sm {
            box-shadow: none !important;
          }
        }
      `}} />
      {/* Salesforce Highlight Panel */}
      <div className={cn(
        "bg-card border rounded-xl shadow-sm p-5 print:shadow-none",
        isQuoteView ? "border-slate-200/80 dark:border-slate-700/60" : "border-border"
      )}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 mt-0.5 print:hidden border",
              isQuoteView
                ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/40 text-indigo-600"
                : "bg-primary/10 border-transparent text-primary"
            )}>
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {isQuoteView ? 'Customer Quote' : 'Pricing Deal'}
                </span>
                <Badge variant={DEAL_STATUS_VARIANTS[deal.status]} className="text-[11px] font-semibold px-2.5 py-0.5 shadow-sm uppercase tracking-wider">
                  {DEAL_STATUS_LABELS[deal.status]}
                </Badge>
                <SlaTimer deal={deal} />
              </div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-foreground mt-0.5">{deal.title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="text-xs h-8 gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            {isQuoteView ? (
              (user?.role === 'sales_rep' || user?.role === 'admin') && (
                <Button size="sm" onClick={() => navigate(`/quotes/${deal.id}/edit`)} className="text-xs h-8 bg-primary hover:bg-primary/95 text-white font-semibold flex items-center gap-1.5 shadow-sm">
                  <FileEdit className="h-3.5 w-3.5" />
                  Edit Quote
                </Button>
              )
            ) : (
              (deal.status === 'draft' || deal.status === 'changes_requested' || deal.status === 'rejected' || deal.status === 'approved') && (user?.role === 'sales_rep' || user?.role === 'admin') && (
                <Button size="sm" onClick={() => navigate(`/deals/${deal.id}/edit`)} className={cn("text-xs h-8 text-white font-semibold flex items-center gap-1.5 shadow-sm", deal.status === 'approved' ? "bg-amber-600 hover:bg-amber-500" : "bg-primary hover:bg-primary/95")}>
                  <FileEdit className="h-3.5 w-3.5" />
                  {deal.status === 'approved' ? 'Edit & Resubmit' : 'Edit Proposal'}
                </Button>
              )
            )}

            {/* Share button */}
            <Button variant="outline" size="sm" onClick={handleShare} className="text-xs h-8 gap-1">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
            </Button>

            {/* Export CSV button */}
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs h-8 gap-1">
              <FileDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>

            {/* Download PDF button */}
            <Button size="sm" onClick={handleDownloadPDF} className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm">
              <FileDown className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </Button>

            {/* Print button */}
            <Button variant="outline" size="sm" onClick={handlePrintPDF} className="text-xs h-8 gap-1">
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </Button>

            {/* Delete button – sales_rep and admin only */}
            {(user.role === 'sales_rep' || user.role === 'admin') && (
              <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(true)} className="text-xs h-8 gap-1 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20">
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Delete {isQuoteView ? 'Quote' : 'Deal'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Highlight Panel Key Fields */}
        <div className={cn(
          "grid gap-4 pt-4 text-xs",
          isQuoteView ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4 lg:grid-cols-7"
        )}>
          <div className="border-r border-border/40 pr-4 last:border-0">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
              <Coins className="h-3 w-3" /> {isQuoteView ? 'Quote Number' : 'Deal Number'}
            </p>
            {(() => {
              const dn = (isQuoteView ? (deal.quote_number || deal.deal_number) : deal.deal_number) ?? ''
              const vMatch = dn.match(/^(.+?)(-v\d+)$/)
              if (vMatch) {
                return (
                  <p className="font-mono font-bold text-primary mt-1.5 text-sm flex items-center gap-1">
                    {vMatch[1]}
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded px-1 py-0.5 leading-none">{vMatch[2]}</span>
                  </p>
                )
              }
              return <p className="font-mono font-bold text-primary mt-1.5 text-sm">{dn}</p>
            })()}
          </div>
          <div className="border-r border-border/40 pr-4 last:border-0">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
              <Building className="h-3 w-3" /> Customer Account
            </p>
            <p className="font-semibold text-foreground mt-1.5 truncate text-sm" title={deal.customer_name}>
              {deal.customer_name}
            </p>
          </div>
          <div className="border-r border-border/40 pr-4 last:border-0">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
              <Package className="h-3 w-3" /> OEM
            </p>
            <p className="font-semibold text-foreground mt-1.5 truncate text-sm" title={deal.oem || '—'}>
              {deal.oem || '—'}
            </p>
          </div>
          <div className="border-r border-border/40 pr-4 last:border-0">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
              <User className="h-3 w-3" /> {isQuoteView ? 'Prepared By' : 'Deal Owner'}
            </p>
            <p className="font-semibold text-foreground mt-1.5 truncate text-sm">
              {deal.creator?.full_name ?? 'System'}
            </p>
          </div>
          <div className="border-r border-border/40 pr-4 last:border-0">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
              <Landmark className="h-3 w-3" /> {isQuoteView ? 'Quote Value' : 'Total Revenue'}
            </p>
            <p className="font-bold text-foreground mt-1.5 text-sm tabular-nums">
              {formatCurrency(deal.total_revenue, deal.currency)}
            </p>
          </div>
          <div className="border-r border-border/50 pr-4 last:border-0">
            <p className="text-muted-foreground font-semibold flex items-center gap-1">
              <Percent className="h-3 w-3" /> {isQuoteView ? 'Gross Margin' : 'Net Margin'}
            </p>
            <p className={cn('font-bold mt-1 text-sm', getMarginColor(isQuoteView ? deal.gross_margin_pct : deal.net_margin_pct))}>
              {formatPercent(isQuoteView ? deal.gross_margin_pct : deal.net_margin_pct)}
            </p>
          </div>
          {!isQuoteView && (
            <div>
              <p className="text-muted-foreground font-semibold flex items-center gap-1">
                <CheckSquare className="h-3 w-3" /> Technical Review
              </p>
              <p className="font-semibold text-foreground mt-1 text-sm">
                {deal.requires_technical ? (
                  <span className="text-primary font-bold">Required</span>
                ) : (
                  <span className="text-muted-foreground">Not Required</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Chevron Tracker ("Salesforce Path") */}
      {!isQuoteView && (
        <Card className="shadow-sm border-border bg-card print:hidden">
          <CardContent className="p-3">
            <PipelineTracker
              currentStatus={deal.status}
              requiresTechnical={deal.requires_technical}
              isQuoteOnly={deal.is_quote_only ?? false}
              belowFloorMargin={
                (deal.is_quote_only ?? false) &&
                (deal.gross_margin_pct ?? 0) / 100 < (settings?.floor_margin_pct ?? 0.06)
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Two-Column Split Layout */}
      <div className="grid gap-6 print:block lg:grid-cols-3">
        {/* Left Columns - Details, Line Items, Overheads Tabs */}
        <div className="lg:col-span-2 space-y-6 print:w-full print:space-y-4">
          <Card className="shadow-sm border-border/80 bg-card overflow-hidden rounded-xl">
            {/* Tabs Selector Header - Hidden on Print */}
            <div className="flex border-b border-border/60 bg-slate-50/50 dark:bg-slate-900/20 print:hidden">
              <button
                onClick={() => setActiveTab('details')}
                className={cn(
                  "px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2",
                  activeTab === 'details'
                    ? "border-primary text-primary bg-card"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <ListCollapse className="h-4 w-4" />
                Details
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className={cn(
                  "px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2",
                  activeTab === 'items'
                    ? "border-primary text-primary bg-card"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <ListCollapse className="h-4 w-4" />
                Line Items ({(deal.items ?? []).length})
              </button>
              <button
                onClick={() => setActiveTab('overheads')}
                className={cn(
                  "px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2",
                  activeTab === 'overheads'
                    ? "border-primary text-primary bg-card"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Coins className="h-4 w-4" />
                Overhead Costs ({(deal.overheads ?? []).length})
              </button>
              {!isQuoteView && (
                <button
                  onClick={() => setActiveTab('quotes')}
                  className={cn(
                    "px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2",
                    activeTab === 'quotes'
                      ? "border-primary text-primary bg-card"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <FileText className="h-4 w-4" />
                  Quotes ({childQuotes.length})
                </button>
              )}
            </div>

            <CardContent className="p-6 print:space-y-8">
              {/* DETAILS SECTION */}
              <div className={cn(activeTab === 'details' ? 'block' : 'hidden print:block', 'space-y-6')}>
                {deal.description && (
                  <div className="bg-muted/30 p-4 rounded border border-border/40">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Deal Scope & Description</h4>
                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{deal.description}</p>
                  </div>
                )}

                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 text-sm">
                  <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Customer Account</span>
                    <span className="font-semibold text-foreground text-right">{deal.customer_name}</span>
                  </div>
                  <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Currency</span>
                    <span className="font-semibold text-foreground font-mono">{deal.currency}</span>
                  </div>
                  <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">OEM / Manufacturer</span>
                    <span className="font-semibold text-foreground text-right">{deal.oem || '—'}</span>
                  </div>
                  {isQuoteView ? (
                    <>
                      <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Quote Number</span>
                        <span className="font-semibold text-foreground font-mono">{deal.quote_number || deal.deal_number}</span>
                      </div>
                      <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Validity Period</span>
                        <span className="font-semibold text-foreground">{deal.validity_period || 7} days</span>
                      </div>
                      <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Prepared By</span>
                        <span className="font-semibold text-foreground">{deal.creator?.full_name ?? '—'}</span>
                      </div>
                      <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Calculated Margin</span>
                        <span className={cn("font-bold text-sm", getMarginColor(deal.gross_margin_pct))}>
                          {formatPercent(deal.gross_margin_pct)}
                        </span>
                      </div>
                      <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Quote Status</span>
                        <span className="font-semibold text-foreground">{DEAL_STATUS_LABELS[deal.status]}</span>
                      </div>
                      {(() => {
                        const floorMargin = settings?.floor_margin_pct ?? 0.06
                        const marginPctDecimal = (deal.gross_margin_pct ?? 0) / 100
                        const isBelowFloor = marginPctDecimal < floorMargin
                        return (
                          <>
                            <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Below Floor Margin?</span>
                              <span className={cn("font-bold text-xs px-2 py-0.5 rounded border",
                                isBelowFloor
                                  ? "text-red-700 bg-red-50/50 border-red-200"
                                  : "text-emerald-700 bg-emerald-50/50 border-emerald-200"
                              )}>
                                {isBelowFloor ? 'YES' : 'NO'}
                              </span>
                            </div>
                            <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Approval Needed</span>
                              <span className="font-semibold text-foreground">
                                {isBelowFloor ? 'Sales Head' : 'Auto (Above Floor)'}
                              </span>
                            </div>
                            {deal.status === 'approved' && (
                              <>
                                <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Approved By</span>
                                  <span className="font-semibold text-foreground">{deal.approved_by || 'System (Auto-Approved)'}</span>
                                </div>
                                <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Approval Date</span>
                                  <span className="font-semibold text-foreground font-mono">{deal.approved_at ? formatDate(deal.approved_at) : '—'}</span>
                                </div>
                                <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Ops Executive</span>
                                  <span className="font-semibold text-primary">{deal.assigned_ops_owner || 'Auto-Assigned on PO'}</span>
                                </div>
                              </>
                            )}
                          </>
                        )
                      })()}
                    </>
                  ) : (
                    <>
                      <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Quote Number</span>
                        <span className="font-semibold text-foreground font-mono">{deal.quote_number || '—'}</span>
                      </div>
                      <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Pipeline Status</span>
                        <span className="font-semibold text-foreground">{DEAL_STATUS_LABELS[deal.status]}</span>
                      </div>
                      <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Deal Owner (Sales Rep)</span>
                        <span className="font-semibold text-foreground">{deal.creator?.full_name} ({deal.creator?.email})</span>
                      </div>
                      <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Assigned Reviewer</span>
                        <span className="font-semibold text-foreground">{deal.assigned_to ? 'Assigned' : 'General Queue'}</span>
                      </div>
                      <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Technical Review Required</span>
                        <span className="font-semibold text-foreground">{deal.requires_technical ? 'Yes' : 'No'}</span>
                      </div>
                    </>
                  )}
                  <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Created Date</span>
                    <span className="font-semibold text-foreground">{formatDate(deal.created_at)}</span>
                  </div>
                  <div className="border-b border-border/30 pb-2.5 flex justify-between items-center gap-4">
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Last Modified Date</span>
                    <span className="font-semibold text-foreground">{formatDate(deal.updated_at)}</span>
                  </div>
                </div>

                {/* Pricing Financial Cards grid inside Details */}
                {isQuoteView ? (
                  // Quote view: show detailed quoted value breakdown
                  <div className="mt-6 border border-slate-200/80 dark:border-slate-700/60 bg-gradient-to-br from-slate-50/90 via-white to-indigo-50/20 dark:from-slate-900/40 dark:via-card dark:to-indigo-950/10 rounded-xl p-5 max-w-md mx-auto space-y-3 shadow-sm print:bg-white print:border-border">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] border-b border-border/50 pb-2.5">
                      Quote Price Summary
                    </h4>
                    {(() => {
                      const subtotal = (deal.items ?? []).reduce((sum, item) => sum + item.quantity * item.quoted_price, 0)
                      const discPct = deal.discount_pct ?? 0
                      const discountAmt = subtotal * (discPct / 100)
                      const shipping = deal.shipping_charge ?? 0
                      const taxableAmt = subtotal - discountAmt + shipping
                      const taxPct = (deal.cgst_pct ?? 0) + (deal.sgst_pct ?? 0) + (deal.igst_pct ?? 0)
                      const taxAmt = taxableAmt * (taxPct / 100)
                      const total = taxableAmt + taxAmt

                      return (
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center text-muted-foreground py-0.5">
                            <span>Subtotal</span>
                            <span className="font-semibold text-foreground tabular-nums">{formatCurrency(subtotal, deal.currency)}</span>
                          </div>
                          {discPct !== 0 && (
                            <div className="flex justify-between items-center text-red-700 dark:text-red-400 bg-red-50/80 dark:bg-red-950/20 px-2.5 py-1.5 rounded-md border border-red-100 dark:border-red-900/30">
                              <span>Discount ({discPct}%)</span>
                              <span className="font-semibold tabular-nums">-{formatCurrency(discountAmt, deal.currency)}</span>
                            </div>
                          )}
                          {shipping > 0 && (
                            <div className="flex justify-between items-center text-muted-foreground py-0.5">
                              <span>Shipping Charges</span>
                              <span className="font-semibold text-foreground tabular-nums">{formatCurrency(shipping, deal.currency)}</span>
                            </div>
                          )}
                          {(discPct !== 0 || shipping > 0) && (
                            <div className="flex justify-between items-center text-muted-foreground border-t border-dashed border-border/50 pt-2">
                              <span>Taxable Amount</span>
                              <span className="font-semibold text-foreground tabular-nums">{formatCurrency(taxableAmt, deal.currency)}</span>
                            </div>
                          )}
                          {taxPct > 0 && (
                            <div className="flex justify-between items-center text-muted-foreground py-0.5">
                              <span>Tax ({taxPct}%)</span>
                              <span className="font-semibold text-foreground tabular-nums">{formatCurrency(taxAmt, deal.currency)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center bg-indigo-600 dark:bg-indigo-600 p-3.5 rounded-lg text-sm font-bold text-white mt-2 shadow-sm">
                            <span>Total Quote Amount</span>
                            <span className="tabular-nums">{formatCurrency(total, deal.currency)}</span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 pt-4 print:grid-cols-5">
                    <div className="bg-muted/20 border border-border p-3.5 rounded text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Revenue</p>
                      <p className="text-lg font-bold mt-1 text-foreground">{formatCurrency(deal.total_revenue, deal.currency)}</p>
                    </div>
                    <div className="bg-muted/20 border border-border p-3.5 rounded text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Costs</p>
                      <p className="text-lg font-bold mt-1 text-foreground">{formatCurrency(deal.total_cost, deal.currency)}</p>
                    </div>
                    <div className={cn(
                      'border p-3.5 rounded text-center',
                      (deal.total_revenue - deal.total_cost) >= 0
                        ? 'bg-emerald-500/5 border-emerald-500/25'
                        : 'bg-red-500/5 border-red-500/25'
                    )}>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Net Value</p>
                      <p className={cn(
                        'text-lg font-bold mt-1',
                        (deal.total_revenue - deal.total_cost) >= 0 ? 'text-emerald-600' : 'text-red-500'
                      )}>
                        {formatCurrency(deal.total_revenue - deal.total_cost, deal.currency)}
                      </p>
                    </div>
                    <div className="bg-muted/20 border border-border p-3.5 rounded text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Gross Margin</p>
                      <p className={cn('text-lg font-bold mt-1', getMarginColor(deal.gross_margin_pct))}>{formatPercent(deal.gross_margin_pct)}</p>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 p-3.5 rounded text-center">
                      <p className="text-[10px] text-primary uppercase font-bold tracking-wider">Net Margin</p>
                      <p className={cn('text-xl font-extrabold mt-1', getMarginColor(deal.net_margin_pct))}>{formatPercent(deal.net_margin_pct)}</p>
                    </div>
                  </div>
                )}

                {/* BOM, SLA, Timeline cards in details tab for Quote Details */}
                {isQuoteView && (
                  <div className="space-y-4">
                    {deal.bom_data && deal.bom_data.length > 0 && (
                      <div className="mt-6 border border-slate-200/80 dark:border-slate-700/60 rounded-xl overflow-hidden bg-card shadow-sm">
                        <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-900/30 border-b border-border/60">
                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] flex items-center gap-2">
                            <Coins className="h-3.5 w-3.5 text-indigo-600" />
                            Bill of Materials (BOM) Annexure
                          </h4>
                        </div>
                        <div className="overflow-x-auto max-h-80">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="bg-slate-100/80 dark:bg-slate-800/50 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                                <th className="px-4 py-2.5 text-left">Module</th>
                                <th className="px-4 py-2.5 text-left">Description</th>
                                <th className="px-4 py-2.5 text-right">Qty</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {(() => {
                                const groups: Record<string, BOMItem[]> = {}
                                for (const item of deal.bom_data!) {
                                  if (!groups[item.section]) groups[item.section] = []
                                  groups[item.section].push(item)
                                }
                                return Object.entries(groups).map(([sect, items]) => (
                                  <Fragment key={sect}>
                                    <tr className="bg-indigo-50/50 dark:bg-indigo-950/20">
                                      <td colSpan={3} className="px-4 py-2 text-[10px] font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">{sect}</td>
                                    </tr>
                                    {items.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-4 py-2.5 pl-6 font-semibold text-foreground">{item.module}</td>
                                        <td className="px-4 py-2.5 text-muted-foreground leading-relaxed">{item.description}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-foreground font-medium tabular-nums">{item.quantity}</td>
                                      </tr>
                                    ))}
                                  </Fragment>
                                ))
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {deal.sla_data && (
                      <div className="border border-slate-200/80 dark:border-slate-700/60 rounded-xl overflow-hidden bg-card shadow-sm">
                        <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-900/30 border-b border-border/60">
                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] flex items-center gap-2">
                            <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                            SLA Details
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-pre-line px-5 py-4 leading-relaxed">{deal.sla_data}</p>
                      </div>
                    )}

                    {deal.timeline_data && (
                      <div className="border border-slate-200/80 dark:border-slate-700/60 rounded-xl overflow-hidden bg-card shadow-sm">
                        <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-900/30 border-b border-border/60">
                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-indigo-600" />
                            Timeline Details
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-pre-line px-5 py-4 leading-relaxed">{deal.timeline_data}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* LINE ITEMS SECTION */}
              <div className={cn(activeTab === 'items' ? 'block' : 'hidden print:block', 'space-y-4 print:border-t print:pt-6 print:mt-6')}>
                <h3 className="hidden print:block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Line Items ({(deal.items ?? []).length})</h3>
                <div className={cn(
                  "overflow-x-auto",
                  isQuoteView && "rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm"
                )}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={cn(
                        "text-left text-muted-foreground border-b",
                        isQuoteView
                          ? "bg-slate-50/90 dark:bg-slate-900/30 border-border/60 text-[10px] uppercase tracking-wide font-bold"
                          : "border-border"
                      )}>
                        <th className={cn(isQuoteView ? "px-4 py-3" : "pb-2")}>Product Name / SKU</th>
                        <th className={cn(isQuoteView ? "px-4 py-3" : "pb-2")}>Description</th>
                        <th className={cn(isQuoteView ? "px-4 py-3 text-right" : "pb-2 text-right")}>Qty</th>
                        <th className={cn(isQuoteView ? "px-4 py-3" : "pb-2")}>UoM</th>
                        {!isQuoteView && <th className="pb-2 text-right">Transfer Cost</th>}
                        <th className={cn(isQuoteView ? "px-4 py-3 text-right" : "pb-2 text-right")}>{isQuoteView ? 'Unit Price' : 'Quoted Price'}</th>
                        <th className={cn(isQuoteView ? "px-4 py-3 text-right" : "pb-2 text-right")}>{isQuoteView ? 'Line Total' : 'Gross Margin'}</th>
                      </tr>
                    </thead>
                    <tbody className={cn(isQuoteView && "divide-y divide-border/30")}>
                      {(deal.items ?? []).map((item, i) => {
                        const rev = item.quantity * item.quoted_price
                        const cost = item.quantity * item.transfer_price
                        const margin = rev > 0 ? ((rev - cost) / rev) * 100 : 0
                        return (
                          <tr key={i} className={cn(
                            "border-b border-border/30 hover:bg-muted/10 transition-colors",
                            isQuoteView && "border-0"
                          )}>
                            <td className={cn("font-semibold text-foreground", isQuoteView ? "px-4 py-3" : "py-3")}>{item.sku}</td>
                            <td className={cn("text-muted-foreground text-xs", isQuoteView ? "px-4 py-3 leading-relaxed" : "py-3 italic")}>{item.product_name}</td>
                            <td className={cn("text-right tabular-nums", isQuoteView ? "px-4 py-3" : "py-3")}>{item.quantity}</td>
                            <td className={cn("text-muted-foreground text-xs", isQuoteView ? "px-4 py-3" : "py-3")}>{item.unit_of_measure}</td>
                            {!isQuoteView && <td className="py-3 text-right font-mono">{formatCurrency(item.transfer_price, deal.currency)}</td>}
                            <td className={cn("text-right font-mono font-medium text-foreground tabular-nums", isQuoteView ? "px-4 py-3" : "py-3")}>{formatCurrency(item.quoted_price, deal.currency)}</td>
                            <td className={cn('text-right font-bold tabular-nums', isQuoteView ? 'px-4 py-3 text-foreground' : cn('py-3', getMarginColor(margin)))}>
                              {isQuoteView ? formatCurrency(rev, deal.currency) : `${(margin || 0).toFixed(1)}%`}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {(deal.items ?? []).length === 0 && (
                    <div className="py-12 text-center text-muted-foreground">No line items configured on this deal.</div>
                  )}
                </div>
              </div>

              {/* OVERHEADS SECTION */}
              <div className={cn(activeTab === 'overheads' ? 'block' : 'hidden print:block', 'space-y-4 print:border-t print:pt-6 print:mt-6')}>
                <h3 className="hidden print:block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Overhead Costs ({(deal.overheads ?? []).length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="pb-2">Overhead Component</th>
                        <th className="pb-2 text-right">Rate / Percentage</th>
                        <th className="pb-2 text-right">Allocated Cost Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(deal.overheads ?? []).map((oh, i) => (
                        <tr key={i} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                          <td className="py-3 font-medium text-foreground">{oh.label}</td>
                          <td className="py-3 text-right font-semibold">
                            {oh.is_percentage ? (
                              <Badge variant="outline" className="font-mono text-xs">{oh.percentage_value}%</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-foreground">
                            {formatCurrency(oh.amount, deal.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(deal.overheads ?? []).length === 0 && (
                    <div className="py-12 text-center text-muted-foreground">No overhead cost factors added.</div>
                  )}
                </div>
              </div>

              {/* QUOTES SECTION */}
              <div className={cn(activeTab === 'quotes' ? 'block' : 'hidden', 'space-y-4 text-left')}>
                <div className="flex items-center justify-between border-b pb-3 border-border/60">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Linked Quotes</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage quotation revisions and proposals for this opportunity</p>
                  </div>
                  {user.role === 'sales_rep' && (
                    <Button
                      onClick={() => navigate(`/quotes/new?dealId=${deal.id}`)}
                      size="sm"
                      className="h-8 text-xs font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Create New Quote
                    </Button>
                  )}
                </div>

                <div className="overflow-x-auto border border-border/80 rounded-xl shadow-sm bg-card">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 dark:bg-slate-900/30 border-b border-border/60 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        <th className="px-4 py-3">Quote #</th>
                        <th className="px-4 py-3">Proposal Title</th>
                        <th className="px-4 py-3 text-right">Value</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3">Last Updated</th>
                        <th className="px-4 py-3 text-right pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30 text-xs">
                      {childQuotes.map((q) => {
                        const dateStr = formatDate(q.updated_at)
                        return (
                          <tr key={q.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-3 font-bold text-foreground font-mono">{q.quote_number}</td>
                            <td className="px-4 py-3 font-medium text-foreground">{q.title}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(q.total_revenue, q.currency)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                q.status === 'approved' ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                                q.status === 'rejected' ? "text-red-750 bg-red-50 border-red-200" :
                                q.status === 'changes_requested' ? "text-orange-750 bg-orange-50 border-orange-200" :
                                "text-slate-650 bg-slate-50 border-slate-200"
                              )}>
                                {DEAL_STATUS_LABELS[q.status]}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{dateStr}</td>
                            <td className="px-4 py-3 text-right pr-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/quotes/${q.id}`)}
                                className="h-7 text-[10px] px-2.5 font-semibold"
                              >
                                View Details
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {childQuotes.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground text-xs bg-slate-50/20">
                      No quotes generated for this deal yet. Click &ldquo;Create New Quote&rdquo; to build one.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Actions Panel & Audit Trail */}
        <div className="space-y-6 print:hidden">
          {/* Approval Actions Panel */}
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="border-b border-border/50 bg-muted/10 py-3.5 px-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                Approval Console
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {deal.rejection_reason && (
                <div className="rounded border border-amber-500/30 bg-amber-500/5 p-3 text-xs mb-4 text-amber-800 dark:text-amber-300">
                  <span className="font-bold flex items-center gap-1 mb-1">
                    <Clock className="h-3.5 w-3.5" /> Reviewer Feedback:
                  </span>
                  &ldquo;{deal.rejection_reason}&rdquo;
                </div>
              )}

              <ApprovalActions
                deal={deal}
                userRole={user.role}
                userId={user.id}
                onUpdate={handleUpdate}
              />
            </CardContent>
          </Card>

          {/* Audit History List */}
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="border-b border-border/50 bg-muted/10 py-3.5 px-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Activity Timeline
                <span className="ml-auto text-[10px] font-normal text-muted-foreground">{audit.length} event{audit.length !== 1 ? 's' : ''}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className={`space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60 ${showAllAudit ? 'max-h-[420px] overflow-y-auto pr-1' : ''}`}>
                {(showAllAudit ? audit : audit.slice(0, 4)).map((entry) => (
                  <motion.div
                    key={entry.id}
                    className="relative pl-6 text-xs"
                  >
                    <div className="absolute left-[5px] top-1.5 h-3.5 w-3.5 rounded-full bg-background border-2 border-primary flex items-center justify-center shrink-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>
                    <div className="bg-muted/10 border border-border/40 p-2 rounded shadow-sm">
                      <div className="flex justify-between items-center gap-1">
                        <p className="font-semibold text-foreground capitalize">
                          {entry.action.replace('_', ' ')}
                        </p>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {formatRelative(entry.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        By {entry.user?.full_name ?? 'System'}
                      </p>
                      {entry.comment && (
                        <p className="text-[11px] mt-1 text-foreground italic border-t border-border/30 pt-1 line-clamp-2">
                          &ldquo;{entry.comment}&rdquo;
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Initial Creation item */}
                {(!audit.length || showAllAudit) && (
                  <div className="relative pl-6 text-xs">
                    <div className="absolute left-[5px] top-1.5 h-3.5 w-3.5 rounded-full bg-background border-2 border-border flex items-center justify-center shrink-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                    </div>
                    <div className="bg-muted/10 border border-border/30 p-2 rounded">
                      <p className="font-semibold text-muted-foreground">Deal Created</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDate(deal.created_at)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Show more / less toggle */}
              {audit.length > 4 && (
                <button
                  onClick={() => setShowAllAudit(v => !v)}
                  className="mt-3 w-full text-[11px] font-semibold text-primary hover:underline text-center cursor-pointer"
                >
                  {showAllAudit ? '↑ Show less' : `↓ Show ${audit.length - 4} more event${audit.length - 4 !== 1 ? 's' : ''}`}
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Previous Versions Panel */}
      {(deal.previous_versions ?? []).length > 0 && (
        <Card className="shadow-sm border-amber-200 bg-amber-50/30 print:hidden">
          <CardHeader className="border-b border-amber-200/60 bg-amber-50 py-3.5 px-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800">
              <History className="h-4 w-4 text-amber-600" />
              Version History & Snapshots
              <Badge className="text-[9px] py-0.5 px-2 bg-amber-100 text-amber-700 border border-amber-200 font-semibold ml-auto">
                {(deal.previous_versions ?? []).length} snapshot{(deal.previous_versions ?? []).length !== 1 ? 's' : ''} saved
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-[11px] text-amber-700 mb-3">
              These are read-only snapshots of previous versions (approved/rejected), preserved when this proposal was edited and resubmitted.
            </p>
            {[...(deal.previous_versions ?? [])].reverse().map((version: DealVersion) => (
              <div key={version.version_number} className="border border-amber-200 rounded-lg overflow-hidden bg-white">
                {/* Version header */}
                <button
                  onClick={() => setExpandedVersion(expandedVersion === version.version_number ? null : version.version_number)}
                  className="w-full flex items-center justify-between p-3 hover:bg-amber-50/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-100 text-amber-700 font-bold text-xs border border-amber-200 shrink-0">
                      v{version.version_number}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-foreground">{version.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Saved {formatDate(version.saved_at)} by {version.saved_by_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="text-xs">
                      <p className="font-bold text-foreground">{formatCurrency(version.total_revenue, deal.currency)}</p>
                      <p className={cn('text-[10px] font-semibold', getMarginColor(version.net_margin_pct))}>
                        Net {formatPercent(version.net_margin_pct)}
                      </p>
                    </div>
                    <Badge className={cn(
                      "text-[9px] py-0.5 px-2 border font-semibold shrink-0",
                      version.status === 'approved' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      version.status === 'rejected' ? "bg-red-50 text-red-700 border-red-200" :
                      "bg-slate-50 text-slate-700 border-slate-200"
                    )}>
                      {DEAL_STATUS_LABELS[version.status] || version.status}
                    </Badge>
                    <span className={`text-muted-foreground transition-transform duration-200 text-xs ${expandedVersion === version.version_number ? 'rotate-180' : ''}`}>▾</span>
                  </div>
                </button>

                {/* Expanded version details */}
                {expandedVersion === version.version_number && (
                  <div className="border-t border-amber-100 p-3 space-y-3 bg-amber-50/20">
                    {/* Financial summary */}
                    {isQuoteView ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white border border-amber-100 rounded p-2.5 text-center">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Subtotal</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {formatCurrency(version.items.reduce((sum, item) => sum + (item.quantity ?? 0) * (item.quoted_price ?? 0), 0), deal.currency)}
                          </p>
                        </div>
                        <div className="bg-white border border-amber-100 rounded p-2.5 text-center">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Discount</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">{version.discount_pct ?? 0}%</p>
                        </div>
                        <div className="bg-white border border-amber-100 rounded p-2.5 text-center">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Shipping</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(version.shipping_charge ?? 0, deal.currency)}</p>
                        </div>
                        <div className="bg-white border border-amber-100 rounded p-2.5 text-center">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Total Value</p>
                          <p className="text-sm font-bold text-indigo-600 mt-0.5">{formatCurrency(version.total_revenue, deal.currency)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white border border-amber-100 rounded p-2.5 text-center">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Revenue</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(version.total_revenue, deal.currency)}</p>
                        </div>
                        <div className="bg-white border border-amber-100 rounded p-2.5 text-center">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Total Cost</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(version.total_cost, deal.currency)}</p>
                        </div>
                        <div className="bg-white border border-amber-100 rounded p-2.5 text-center">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Gross Margin</p>
                          <p className={cn('text-sm font-bold mt-0.5', getMarginColor(version.gross_margin_pct))}>{formatPercent(version.gross_margin_pct)}</p>
                        </div>
                        <div className="bg-white border border-amber-100 rounded p-2.5 text-center">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Net Margin</p>
                          <p className={cn('text-sm font-bold mt-0.5', getMarginColor(version.net_margin_pct))}>{formatPercent(version.net_margin_pct)}</p>
                        </div>
                      </div>
                    )}

                    {/* Line items */}
                    {version.items.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Line Items ({version.items.length})</p>
                        <div className="border border-amber-100 rounded overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-amber-50 text-left text-muted-foreground border-b border-amber-100">
                                <th className="p-2 font-semibold">Product / SKU</th>
                                <th className="p-2 font-semibold text-right">Qty</th>
                                {!isQuoteView && <th className="p-2 font-semibold text-right">Transfer Price</th>}
                                <th className="p-2 font-semibold text-right">{isQuoteView ? 'Unit Price' : 'Quoted Price'}</th>
                                <th className="p-2 font-semibold text-right">Line Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {version.items.map((item, i) => (
                                <tr key={i} className="border-b border-amber-50 hover:bg-amber-50/30">
                                  <td className="p-2">
                                    <span className="font-semibold text-foreground">{item.product_name}</span>
                                    <span className="block text-[10px] text-muted-foreground">{item.sku}</span>
                                  </td>
                                  <td className="p-2 text-right">{item.quantity}</td>
                                  {!isQuoteView && <td className="p-2 text-right text-muted-foreground">{formatCurrency(item.transfer_price, deal.currency)}</td>}
                                  <td className="p-2 text-right">{formatCurrency(item.quoted_price, deal.currency)}</td>
                                  <td className="p-2 text-right font-bold">{formatCurrency(item.quoted_price * item.quantity, deal.currency)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Printable Quote Template (Customer Facing) ── */}
      {isQuoteView && (
        <>
          <style dangerouslySetInnerHTML={{
            __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-quote, #printable-quote * {
                visibility: visible;
              }
              #printable-quote {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                color: black !important;
                padding: 12px 24px;
              }
            }
          `}} />

          <div id="printable-quote" className="hidden print:block bg-white text-black space-y-6 text-left">
            {/* Header section with Logo & Address details */}
            <div className="flex justify-between items-start border-b pb-6">
              <div className="flex items-start gap-4">
                <img
                  src="https://framerusercontent.com/images/AlNvsxkJzF8SFWwwytH2xsnL8uM.png"
                  alt="Aicera Logo"
                  className="h-8 w-8 rounded object-contain shrink-0"
                />
                <div className="space-y-1">
                  <div className="text-xl font-bold tracking-tight text-indigo-900 font-display">
                    Aicera Systems Pvt Ltd
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-relaxed">
                    sales@aicera.co.in | 9945073777 | GSTIN: 29AAXCA8339E1Z1<br />
                    224, Bannerghatta Rd, Near Arekere Gate, Arekere, Bengaluru - 560 076
                  </div>
                </div>
              </div>

              <div className="text-right space-y-1">
                <h1 className="text-xl font-bold uppercase text-indigo-900 tracking-wider">Quotation</h1>
                <div className="text-[10px]">
                  <p><span className="text-muted-foreground font-semibold">Quote Number:</span> <strong className="text-black font-mono">{deal.quote_number || deal.deal_number}</strong></p>
                  <p><span className="text-muted-foreground font-semibold">Date:</span> <span className="font-medium">{formatDate(deal.created_at)}</span></p>
                  <p><span className="text-muted-foreground font-semibold">Validity:</span> <span className="font-medium">{deal.validity_period || 30} days</span></p>
                </div>
              </div>
            </div>

            {/* Address / Customer Grid */}
            <div className="grid grid-cols-2 gap-6 text-xs border-b pb-6">
              <div className="space-y-1">
                <span className="font-bold text-indigo-900 uppercase tracking-wide text-[10px]">Customer / Client</span>
                <p className="font-bold text-sm">{deal.customer_name}</p>
                <p className="text-muted-foreground">Account Name: {deal.customer_name}</p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-indigo-900 uppercase tracking-wide text-[10px]">Quote Parameters</span>
                <div className="text-muted-foreground leading-normal mt-1">
                  <p>Currency: <span className="text-black font-semibold font-mono">{deal.currency}</span></p>
                  <p>Owner: <span className="text-black font-medium">{deal.creator?.full_name ?? 'System'}</span></p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <span className="font-bold text-indigo-900 uppercase tracking-wide text-[10px]">Quoted Line Items</span>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border bg-muted/20">
                    <th className="py-2 pl-2">SL</th>
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Unit Price</th>
                    <th className="py-2 text-right pr-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(deal.items ?? []).map((item, i) => {
                    const rev = item.quantity * item.quoted_price
                    return (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-2.5 pl-2 font-semibold">{i + 1}</td>
                        <td className="py-2.5">
                          <p className="font-semibold text-foreground">{item.sku}</p>
                          <p className="text-[10px] text-muted-foreground italic">{item.product_name}</p>
                        </td>
                        <td className="py-2.5 text-right">{item.quantity}</td>
                        <td className="py-2.5 text-right font-mono">{formatCurrency(item.quoted_price, deal.currency)}</td>
                        <td className="py-2.5 text-right font-mono pr-2">{formatCurrency(rev, deal.currency)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pricing summary breakdown */}
            {(() => {
              const subtotal = (deal.items ?? []).reduce((sum, item) => sum + item.quantity * item.quoted_price, 0)
              const discPct = deal.discount_pct ?? 0
              const discountAmt = subtotal * (discPct / 100)
              const shipping = deal.shipping_charge ?? 0
              const taxableAmt = subtotal - discountAmt + shipping
              const taxPct = (deal.cgst_pct ?? 0) + (deal.sgst_pct ?? 0) + (deal.igst_pct ?? 0)
              const taxAmt = taxableAmt * (taxPct / 100)
              const total = taxableAmt + taxAmt

              return (
                <div className="flex justify-end pt-2">
                  <div className="w-[300px] text-xs space-y-2 border-t pt-2">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-foreground font-mono">{formatCurrency(subtotal, deal.currency)}</span>
                    </div>
                    {discPct !== 0 && (
                      <div className="flex justify-between items-center text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded">
                        <span>Discount ({discPct}%):</span>
                        <span className="font-semibold font-mono">-{formatCurrency(discountAmt, deal.currency)}</span>
                      </div>
                    )}
                    {shipping > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Shipping Charges:</span>
                        <span className="font-semibold text-foreground font-mono">{formatCurrency(shipping, deal.currency)}</span>
                      </div>
                    )}
                    {taxPct > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Tax ({taxPct}%):</span>
                        <span className="font-semibold text-foreground font-mono">{formatCurrency(taxAmt, deal.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center bg-indigo-50 border border-indigo-200 p-2.5 rounded-lg text-xs font-bold text-indigo-900 mt-2">
                      <span>Total Quote Amount:</span>
                      <span className="font-mono">{formatCurrency(total, deal.currency)}</span>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Terms & Conditions */}
            {deal.terms_conditions && (
              <div className="border-t pt-4 mt-6">
                <span className="font-bold text-indigo-900 uppercase tracking-wide text-[10px]">Terms & Conditions</span>
                <p className="text-[10px] text-muted-foreground whitespace-pre-line leading-relaxed mt-1">
                  {deal.terms_conditions}
                </p>
              </div>
            )}

            {/* Signatory Box */}
            <div className="flex justify-end pt-8">
              <div className="w-[260px] border border-border rounded-lg p-4 bg-muted/10 text-xs text-left">
                <span className="font-bold text-indigo-900 uppercase tracking-wide text-[9px]">FOR COMPANY</span>
                <p className="font-semibold mt-1">For Aicera Systems Pvt Ltd</p>
                <div className="h-10 border-b border-dashed border-border mt-3" />
                <p className="text-[10px] text-muted-foreground mt-1 text-center">Authorised Signatory</p>
              </div>
            </div>
          </div>
        </>
      )}
      <SignaturePad isOpen={isSigPadOpen} onClose={() => setIsSigPadOpen(false)} onSave={handleSaveSignature} />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete {isQuoteView ? 'Quote' : 'Deal'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete <strong className="text-foreground">{deal?.deal_number || deal?.title}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-4 border-t mt-3">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteItem} disabled={isDeleting} className="gap-1.5 font-semibold">
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : `Delete ${isQuoteView ? 'Quote' : 'Deal'}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
