import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { Download, FileSearch, Lock, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  exportAuditLogCsv,
  fetchAuditLog,
} from '@/services/audit-service'
import {
  AUDIT_ACTION_LABELS,
  DEAL_STATUS_LABELS,
  type AuditAction,
  type DealAudit,
} from '@/types'
import { formatDate, formatRelative } from '@/lib/utils'

const ACTION_VARIANT: Partial<Record<AuditAction, 'default' | 'success' | 'warning' | 'danger'>> = {
  approved: 'success',
  rejected: 'danger',
  changes_requested: 'warning',
  submitted: 'default',
}

export function AuditLogPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<DealAudit[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAuditLog({
        search,
        action: actionFilter,
        limit: 500,
      })
      setRows(data)
    } catch {
      toast.error('Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [search, actionFilter])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const columns = useMemo<ColumnDef<DealAudit>[]>(
    () => [
      {
        accessorKey: 'created_at',
        header: 'When',
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{formatRelative(row.original.created_at)}</p>
            <p className="text-[10px] text-muted-foreground">
              {formatDate(row.original.created_at)}
            </p>
          </div>
        ),
      },
      {
        id: 'deal',
        header: 'Deal',
        cell: ({ row }) => (
          <button
            type="button"
            className="text-left hover:text-primary transition-colors"
            onClick={() => navigate(`/deals/${row.original.deal_id}`)}
          >
            <p className="font-mono text-xs text-primary">
              {row.original.deal_number ?? '—'}
            </p>
            <p className="text-sm truncate max-w-[200px]">
              {row.original.deal_title ?? 'Unknown deal'}
            </p>
          </button>
        ),
      },
      {
        id: 'actor',
        header: 'Actor',
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.user?.full_name ?? 'System'}</p>
            <p className="text-xs text-muted-foreground">{row.original.user?.email}</p>
          </div>
        ),
      },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ row }) => (
          <Badge variant={ACTION_VARIANT[row.original.action] ?? 'outline'}>
            {AUDIT_ACTION_LABELS[row.original.action]}
          </Badge>
        ),
      },
      {
        id: 'transition',
        header: 'Status change',
        cell: ({ row }) => {
          const { from_status, to_status } = row.original
          if (!from_status && !to_status) return <span className="text-muted-foreground">—</span>
          return (
            <span className="text-xs">
              {from_status ? DEAL_STATUS_LABELS[from_status] : '—'}
              {' → '}
              {to_status ? DEAL_STATUS_LABELS[to_status] : '—'}
            </span>
          )
        },
      },
      {
        accessorKey: 'comment',
        header: 'Notes',
        cell: ({ row }) => (
          <p className="text-sm text-muted-foreground max-w-[240px] truncate">
            {row.original.comment ?? '—'}
          </p>
        ),
      },
    ],
    [navigate]
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            Immutable record of pricing decisions and workflow actions
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            exportAuditLogCsv(rows)
            toast.success('Audit log exported')
          }}
          disabled={rows.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-1">
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rows.length}</p>
              <p className="text-xs text-muted-foreground">Events loaded</p>
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="pt-6 flex items-start gap-3 text-sm">
            <Lock className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              Audit entries are append-only and cannot be edited or deleted from the application.
              Required for compliance reviews and internal investigations.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Activity trail
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search deal, user, comment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
            <Select
              value={actionFilter}
              onValueChange={(v) => setActionFilter(v as AuditAction | 'all')}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {(Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]).map((a) => (
                  <SelectItem key={a} value={a}>
                    {AUDIT_ACTION_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-center py-12 text-muted-foreground">Loading audit log...</p>
          ) : rows.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No audit events match your filters</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b text-muted-foreground">
                    {hg.headers.map((h) => (
                      <th key={h.id} className="pb-3 text-left font-medium px-2">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-3 px-2 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
