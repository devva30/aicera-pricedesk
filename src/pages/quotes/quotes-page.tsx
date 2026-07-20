import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  IndianRupee,
  RefreshCw,
  ArrowRight,
  Plus,
  Search,
  Filter,
  ExternalLink,
  AlertCircle,
  Edit3,
  Eye,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { fetchDeals, fetchQuotes, deleteQuote } from '@/services/deals-service'
import { formatCurrency } from '@/lib/utils'
import type { Deal, DealStatus } from '@/types'
import { EmptyState } from '@/components/shared/empty-state'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_META: Record<
  DealStatus,
  {
    label: string
    color: string
    bg: string
    border: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  draft: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', icon: Edit3 },
  pending_finance: { label: 'Finance Review', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Clock },
  pending_technical: { label: 'Tech Review', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', icon: Clock },
  pending_sales_head: { label: 'Head Review', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock },
  approved: { label: 'Approved', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle },
  changes_requested: { label: 'Revision Needed', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertCircle },
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} month${months !== 1 ? 's' : ''} ago`
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface QuoteStatProps {
  title: string
  value: string | number
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  valueColor?: string
  loading?: boolean
}

function QuoteStat({ title, value, sub, icon: Icon, iconBg, valueColor, loading }: QuoteStatProps) {
  if (loading) {
    return <div className="bg-card border border-border rounded-xl p-5 shadow-sm animate-pulse h-28" />
  }
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm premium-card hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-tight truncate">{title}</p>
          <p className={`text-2xl font-extrabold font-display tracking-tight mt-2 ${valueColor ?? 'text-foreground'}`}>{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground mt-1 truncate">{sub}</p>}
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-border/40 ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DealStatus }) {
  const meta = STATUS_META[status] || STATUS_META.draft
  const Icon = meta.icon
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.color} ${meta.bg} ${meta.border}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {meta.label}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function QuotesPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [quotes, setQuotes] = useState<Deal[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DealStatus | 'all'>('all')
  const [quoteToDelete, setQuoteToDelete] = useState<Deal | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteQuote = async () => {
    if (!quoteToDelete) return
    setIsDeleting(true)
    try {
      await deleteQuote(quoteToDelete.id)
      setQuotes((prev) => prev.filter((q) => q.id !== quoteToDelete.id))
      toast.success(`Quote ${quoteToDelete.deal_number || quoteToDelete.title} deleted successfully`)
      setQuoteToDelete(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete quote')
    } finally {
      setIsDeleting(false)
    }
  }

  const loadData = async () => {
    if (!user?.role || !user?.id) return
    setIsLoading(true)
    try {
      const qData = await fetchQuotes(user.role, user.id)
      const dData = await fetchDeals(user.role, user.id)
      setQuotes(qData || [])
      setDeals(dData || [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const dealMap = useMemo(() => {
    const map: Record<string, Deal> = {}
    for (const d of deals) {
      map[d.id] = d
    }
    return map
  }, [deals])

  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user?.id])

  // ── Metrics ──────────────────────────────────────────────────────────────
  const totalValue = useMemo(() => quotes.reduce((s, q) => s + q.total_revenue, 0), [quotes])
  const approved = useMemo(() => quotes.filter(q => q.status === 'approved').length, [quotes])
  const pending = useMemo(() => quotes.filter(q => ['pending_finance', 'pending_technical', 'pending_sales_head'].includes(q.status)).length, [quotes])
  const revisionNeed = useMemo(() => quotes.filter(q => q.status === 'changes_requested').length, [quotes])

  // Status breakdown counts
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<DealStatus, number>> = {}
    for (const q of quotes) {
      counts[q.status] = (counts[q.status] ?? 0) + 1
    }
    return counts
  }, [quotes])

  // ── Filtered + sorted list ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return quotes
      .filter(q => statusFilter === 'all' || q.status === statusFilter)
      .filter(q => {
        if (!search) return true
        const s = search.toLowerCase()
        return (
          q.quote_number?.toLowerCase().includes(s) ||
          q.title.toLowerCase().includes(s) ||
          q.customer_name.toLowerCase().includes(s)
        )
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }, [quotes, search, statusFilter])

  // Recent 5 quotes for the dashboard strip
  const recentQuotes = useMemo(
    () =>
      quotes
        .slice()
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5),
    [quotes]
  )

  const allStatuses = Object.keys(STATUS_META) as DealStatus[]

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Quote Management
              </span>
              <h1 className="text-2xl font-bold font-display tracking-tight text-foreground mt-0.5">
                My Quotes
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track and manage all your commercial proposals and quotes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={loadData}
              title="Refresh"
              className="h-9 w-9"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {user.role === 'sales_rep' && (
              <Button
                onClick={() => navigate('/quotes/new')}
                size="sm"
                className="h-9 px-4 text-xs font-semibold"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New Quote
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuoteStat
          title="Total Quotes"
          value={quotes.length}
          sub="All records"
          icon={FileText}
          iconBg="bg-slate-100 text-slate-700"
          loading={isLoading}
        />
        <QuoteStat
          title="Total Value"
          value={formatCurrency(totalValue)}
          sub="Pipeline value"
          icon={IndianRupee}
          iconBg="bg-primary/10 text-primary"
          valueColor="text-primary"
          loading={isLoading}
        />
        <QuoteStat
          title="Approved"
          value={approved}
          sub="Ready to contract"
          icon={CheckCircle2}
          iconBg="bg-emerald-100 text-emerald-600"
          valueColor="text-emerald-600"
          loading={isLoading}
        />
        <QuoteStat
          title="Pending Review"
          value={pending}
          sub="Awaiting approval"
          icon={Clock}
          iconBg="bg-amber-100 text-amber-600"
          valueColor="text-amber-600"
          loading={isLoading}
        />
      </div>

      {/* ── Status Breakdown pills ── */}
      {!isLoading && quotes.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Status Breakdown
          </p>
          <div className="flex flex-wrap gap-2">
            {allStatuses.map(status => {
              const count = statusCounts[status] ?? 0
              if (count === 0) return null
              const meta = STATUS_META[status]
              const isActive = statusFilter === status
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(s => (s === status ? 'all' : status))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${isActive
                      ? `${meta.color} ${meta.bg} ${meta.border} ring-2 ring-offset-1`
                      : `${meta.color} ${meta.bg} ${meta.border} opacity-70 hover:opacity-100`
                    }`}
                >
                  <span className="font-bold text-sm leading-none">{count}</span>
                  {meta.label}
                </button>
              )
            })}
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-border text-muted-foreground hover:bg-muted/50 transition-all cursor-pointer"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Recent Quotes strip ── */}
      {!isLoading && recentQuotes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-bold font-display text-foreground">Recent Quotes</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-primary"
              onClick={() => setStatusFilter('all')}
            >
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40 text-[10px] font-bold text-muted-foreground uppercase">
                    <th className="p-3 pl-4">Quote #</th>
                    <th className="p-3">Deal / Opportunity Name</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Value</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Last Updated</th>
                    <th className="p-3 pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-xs">
                  {recentQuotes.map(q => (
                    <tr
                      key={q.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => navigate(`/quotes/${q.id}`)}
                    >
                      <td className="p-3 pl-4 font-bold text-foreground whitespace-nowrap">
                        <span>{q.quote_number}</span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {q.parent_deal_id && dealMap[q.parent_deal_id] ? (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              navigate(`/deals/${q.parent_deal_id}`)
                            }}
                            className="text-primary hover:underline font-semibold flex items-center gap-1 text-left bg-transparent border-0 cursor-pointer"
                          >
                            <span>{dealMap[q.parent_deal_id].title}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              ({dealMap[q.parent_deal_id].deal_number})
                            </span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 max-w-[200px]">
                        <span className="text-foreground font-medium truncate block">{q.title}</span>
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{q.customer_name}</td>
                      <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                        {formatCurrency(q.total_revenue)}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {getRelativeTime(q.updated_at)}
                      </td>
                      <td className="p-3 pr-4">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            navigate(`/quotes/${q.id}`)
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-primary hover:bg-primary/10 transition-colors border border-primary/20"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── All Quotes with Search ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold font-display text-foreground">
              {statusFilter === 'all' ? 'All Quotes' : `${STATUS_META[statusFilter].label} Quotes`}
            </h2>
            {filtered.length > 0 && (
              <span className="text-xs text-muted-foreground font-medium">({filtered.length})</span>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by quote number, title or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-card border border-border rounded-lg animate-pulse shadow-sm" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No quotes found"
            description={search || statusFilter !== 'all'
              ? 'Try adjusting your search query or status filter.'
              : 'Quotes are generated when you create a pricing deal with a quote number.'}
            actionLabel={user.role === 'sales_rep' && !search && statusFilter === 'all' ? "Create New Quote" : undefined}
            onAction={user.role === 'sales_rep' && !search && statusFilter === 'all' ? () => navigate('/quotes/new') : undefined}
          />
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40 text-[10px] font-bold text-muted-foreground uppercase">
                    <th className="p-3 pl-4">Quote #</th>
                    <th className="p-3">Deal / Opportunity Name</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Revenue</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Updated</th>
                    {user.role !== 'sales_rep' && <th className="p-3">By</th>}
                    <th className="p-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-xs">
                  {filtered.map(q => (
                    <tr
                      key={q.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/quotes/${q.id}`)}
                    >
                      <td className="p-3 pl-4 whitespace-nowrap font-bold text-foreground">
                        <span className="flex items-center gap-1">
                          {q.quote_number}
                          <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {q.parent_deal_id && dealMap[q.parent_deal_id] ? (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              navigate(`/deals/${q.parent_deal_id}`)
                            }}
                            className="text-primary hover:underline font-semibold flex items-center gap-1 text-left bg-transparent border-0 cursor-pointer"
                          >
                            <span>{dealMap[q.parent_deal_id].title}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              ({dealMap[q.parent_deal_id].deal_number})
                            </span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 max-w-[180px]">
                        <span className="text-foreground font-medium block truncate">{q.title}</span>
                        {q.oem && (
                          <span className="text-[10px] text-muted-foreground">OEM: {q.oem}</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{q.customer_name}</td>
                      <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                        {formatCurrency(q.total_revenue)}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {getRelativeTime(q.updated_at)}
                      </td>
                      {user.role !== 'sales_rep' && (
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {q.creator?.full_name ?? '—'}
                        </td>
                      )}
                      <td className="p-3 pr-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              navigate(`/quotes/${q.id}`)
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-primary hover:bg-primary/10 transition-colors border border-primary/20"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </button>
                          {user.role === 'sales_rep' &&
                            (q.status === 'draft' || q.status === 'changes_requested') && (
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  navigate(`/quotes/${q.id}/edit`)
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-amber-700 hover:bg-amber-50 transition-colors border border-amber-200"
                              >
                                <Edit3 className="h-3 w-3" />
                                Edit
                              </button>
                            )}
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setQuoteToDelete(q)
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-red-600 hover:bg-red-50 transition-colors border border-red-200"
                            title="Delete Quote"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer summary */}
            <div className="px-4 py-3 border-t border-border/40 bg-muted/10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
              <span>
                {filtered.length} quote{filtered.length !== 1 ? 's' : ''} shown
              </span>
              <div className="flex items-center gap-4">
                <span>
                  Total Value:{' '}
                  <strong className="text-foreground">
                    {formatCurrency(filtered.reduce((s, q) => s + q.total_revenue, 0))}
                  </strong>
                </span>
                <span>
                  Avg Margin:{' '}
                  <strong className="text-foreground">
                    {filtered.length > 0
                      ? ((filtered.reduce((s, q) => s + (q.net_margin_pct || 0), 0) / filtered.length) || 0).toFixed(1)
                      : '0.0'}
                    %
                  </strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Revision Needed Alert ── */}
      {revisionNeed > 0 && !isLoading && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-orange-900 text-sm">Action Required — Revision Needed</p>
              <p className="text-xs text-orange-700 mt-0.5">
                {revisionNeed} quote{revisionNeed !== 1 ? 's need' : ' needs'} revision based on reviewer
                feedback.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white border-0"
            onClick={() => setStatusFilter('changes_requested')}
          >
            Review Now
          </Button>
        </div>
      )}

      {/* Delete Quote Confirmation Dialog */}
      <Dialog open={Boolean(quoteToDelete)} onOpenChange={(open) => !open && setQuoteToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Quote
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete <strong className="text-foreground">{quoteToDelete?.deal_number || quoteToDelete?.title}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-4 border-t mt-3">
            <Button variant="outline" size="sm" onClick={() => setQuoteToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteQuote} disabled={isDeleting} className="gap-1.5 font-semibold">
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete Quote'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
