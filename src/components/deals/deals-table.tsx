import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, Clock, CheckCircle2, XCircle, AlertTriangle, FileText, Banknote, Wrench, Crown, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Deal } from '@/types'
import { cn, formatCurrency, formatPercent, getMarginColor } from '@/lib/utils'
import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/empty-state'
import { SlaTimer } from '@/components/shared/sla-timer'
import { deleteDeal } from '@/services/deals-service'
import { removeDeal } from '@/store/deals-slice'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  draft: {
    label: 'Draft',
    icon: <FileText className="h-3 w-3" />,
    className: 'bg-slate-100 text-slate-600 border border-slate-200',
  },
  pending_finance: {
    label: 'Finance Review',
    icon: <Banknote className="h-3 w-3" />,
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  pending_technical: {
    label: 'Technical Review',
    icon: <Wrench className="h-3 w-3" />,
    className: 'bg-violet-50 text-violet-700 border border-violet-200',
  },
  pending_sales_head: {
    label: 'Sales Head Review',
    icon: <Crown className="h-3 w-3" />,
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  approved: {
    label: 'Approved',
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    icon: <XCircle className="h-3 w-3" />,
    className: 'bg-red-50 text-red-700 border border-red-200',
  },
  changes_requested: {
    label: 'Changes Requested',
    icon: <AlertTriangle className="h-3 w-3" />,
    className: 'bg-orange-50 text-orange-700 border border-orange-200',
  },
}

function StatusPill({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    icon: <Clock className="h-3 w-3" />,
    className: 'bg-muted text-muted-foreground border border-border',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  )
}

interface DealsTableProps {
  deals: Deal[]
  showCreator?: boolean
  hideStatusFilter?: boolean
  onDeleted?: (id: string) => void
}

export function DealsTable({
  deals,
  showCreator = false,
  hideStatusFilter = false,
  onDeleted,
}: DealsTableProps) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const user = useAuthStore((s) => s.user)

  const handleDelete = async () => {
    if (!dealToDelete) return
    setIsDeleting(true)
    try {
      await deleteDeal(dealToDelete.id, user?.id)
      dispatch(removeDeal(dealToDelete.id))
      if (onDeleted) onDeleted(dealToDelete.id)
      toast.success(`Deal ${dealToDelete.deal_number || dealToDelete.title} deleted successfully`)
      setDealToDelete(null)
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete deal')
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter deals by search term (title, customer, deal number) and status pills
  const filteredDeals = useMemo(() => {
    return (deals || []).filter((d) => {
      if (!d) return false
      const title = d.title || ''
      const cust = d.customer_name || ''
      const dn = d.deal_number || ''
      const searchLower = (searchTerm || '').toLowerCase()
      const matchesSearch =
        title.toLowerCase().includes(searchLower) ||
        cust.toLowerCase().includes(searchLower) ||
        dn.toLowerCase().includes(searchLower)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && ['pending_technical', 'pending_finance', 'pending_sales_head'].includes(d.status)) ||
        d.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [deals, searchTerm, statusFilter])

  const columns = useMemo<ColumnDef<Deal>[]>(
    () => [
      {
        accessorKey: 'deal_number',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Deal #
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const dn = row.original.deal_number ?? ''
          const vMatch = dn.match(/^(.+?)(-v\d+)$/)
          if (vMatch) {
            return (
              <span className="inline-flex items-center gap-1">
                <span className="font-mono text-xs text-primary">{vMatch[1]}</span>
                <span className="font-mono text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded px-1 py-0.5 leading-none">{vMatch[2]}</span>
              </span>
            )
          }
          return <span className="font-mono text-xs text-primary">{dn}</span>
        },
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <div>
            <p className="font-medium truncate max-w-[200px]">{row.original.title || 'Untitled Deal'}</p>
            <p className="text-xs text-muted-foreground">{row.original.customer_name || 'N/A'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1 items-start">
            <StatusPill status={row.original.status} />
            <SlaTimer deal={row.original} compact />
          </div>
        ),
      },
      {
        accessorKey: 'total_revenue',
        header: 'Revenue',
        cell: ({ row }) => {
          const d = row.original
          // Fall back to computing from items if total_revenue is missing/zero
          const rev =
            d.total_revenue > 0
              ? d.total_revenue
              : (d.items ?? []).reduce(
                  (s, i) => s + (Number(i.quoted_price) || 0) * (Number(i.quantity) || 0),
                  0
                )
          return formatCurrency(rev, d.currency)
        },
      },
      {
        id: 'net_value',
        header: 'Net Value',
        cell: ({ row }) => {
          const d = row.original
          const rev =
            d.total_revenue > 0
              ? d.total_revenue
              : (d.items ?? []).reduce(
                  (s, i) => s + (Number(i.quoted_price) || 0) * (Number(i.quantity) || 0),
                  0
                )
          const cost = d.total_cost > 0
            ? d.total_cost
            : (d.items ?? []).reduce(
                (s, i) => s + (Number(i.transfer_price) || 0) * (Number(i.quantity) || 0),
                0
              )
          const netValue = rev - cost
          return (
            <span className={cn('font-semibold font-mono', netValue >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {formatCurrency(netValue, d.currency)}
            </span>
          )
        },
      },
      {
        accessorKey: 'net_margin_pct',
        header: 'Net Margin',
        cell: ({ row }) => (
          <span className={cn('font-semibold', getMarginColor(row.original.net_margin_pct))}>
            {formatPercent(row.original.net_margin_pct ?? 0)}
          </span>
        ),
      },
      ...(showCreator
        ? [
            {
              id: 'creator',
              header: 'Rep',
              cell: ({ row }: any) => (
                <span className="text-xs text-muted-foreground font-medium">
                  {row.original.sales_rep_name || row.original.creator?.full_name || '—'}
                </span>
              ),
            } as ColumnDef<Deal>,
          ]
        : []),
      {
        accessorKey: 'updated_at',
        header: 'Updated',
        cell: ({ row }) =>
          new Date(row.original.updated_at).toLocaleDateString(),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const deal = row.original
          return (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              title="Delete Deal"
              onClick={(e) => {
                e.stopPropagation()
                setDealToDelete(deal)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )
        },
      },
    ],
    [showCreator]
  )

  const table = useReactTable({
    data: filteredDeals,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border p-3.5 sm:p-4 rounded-xl shadow-xs">
        {/* Search Input Box */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals, customer, or deal #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 sm:h-10 border-border text-xs rounded-lg w-full bg-background"
          />
        </div>

        {/* Status Dropdown Filter */}
        {!hideStatusFilter && (
          <div className="w-full sm:w-52">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full h-9 sm:h-10 border-border bg-background text-xs font-semibold">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="draft" className="text-xs">Drafts</SelectItem>
                <SelectItem value="pending" className="text-xs">Pending Review</SelectItem>
                <SelectItem value="approved" className="text-xs">Approved</SelectItem>
                <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
                <SelectItem value="changes_requested" className="text-xs">Changes Requested</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Table Element container — horizontally scrollable on mobile */}
      <div className="glass-card overflow-hidden rounded-xl">
        <div className="sm:hidden px-3 py-1.5 bg-muted/40 text-[10px] text-muted-foreground flex items-center justify-between border-b border-border/40">
          <span>👈 Swipe horizontally to view full table details 👉</span>
        </div>
        <div className="overflow-x-auto touch-pan-x">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-border/50 bg-muted/30">
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => navigate(`/deals/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {table.getRowModel().rows.length === 0 && (
          <EmptyState
            icon={FileText}
            title="No deals found"
            description={searchTerm || statusFilter !== 'all' ? "Try adjusting your search query or filters to find what you're looking for." : "No deals are currently registered. Let's create your first deal workflow."}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete Deal Confirmation Dialog */}
      <Dialog open={Boolean(dealToDelete)} onOpenChange={(open) => !open && setDealToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Deal
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete <strong className="text-foreground">{dealToDelete?.deal_number || dealToDelete?.title}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-4 border-t mt-3">
            <Button variant="outline" size="sm" onClick={() => setDealToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting} className="gap-1.5 font-semibold">
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete Deal'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
