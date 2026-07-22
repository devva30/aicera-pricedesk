import { useEffect, useState } from 'react'
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Save,
  X,
  TrendingUp,
  IndianRupee,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { fetchTargets, saveTarget, deleteTarget, fetchSettings, clearStaleMockTargets } from '@/services/targets-service'
import { fetchUsers } from '@/services/users-service'
import { formatCurrency } from '@/lib/utils'
import type { SalesTarget, SalesSettings, User } from '@/types'

// ─── Empty form factory ───────────────────────────────────────────────────────

const emptyForm = (fy: string): Partial<SalesTarget> => ({
  salesperson_name: '',
  salesperson_id: '',
  financial_year: fy,
  topline_target: 0,
  region: '',
  is_active: true,
})

// ─── Component ───────────────────────────────────────────────────────────────

export function AdminTargetsPage() {
  const [targets, setTargets] = useState<SalesTarget[]>([])
  const [salesReps, setSalesReps] = useState<User[]>([])
  const [settings, setSettings] = useState<SalesSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<SalesTarget>>({})
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    // Remove any stale hardcoded mock data from localStorage on first load
    clearStaleMockTargets()
    try {
      const [t, s, users] = await Promise.all([
        fetchTargets(),
        Promise.resolve(fetchSettings()),
        fetchUsers(),
      ])
      setTargets(t)
      setSettings(s)
      // Only show users with sales_rep role as selectable targets
      setSalesReps(users.filter((u) => u.role === 'sales_rep' && u.is_active !== false))
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const s = settings
  const incentivePct = s?.incentive_pct ?? 0.05
  const bottomLinePct = s?.bottom_line_pct ?? 0.08
  const currentFY = s?.financial_year ?? 'FY 2026-27'

  // ─── Totals ───────────────────────────────────────────────────────────────

  const totalTopline = targets.filter(t => t.is_active).reduce((sum, t) => sum + t.topline_target, 0)
  const totalBottomline = totalTopline * bottomLinePct
  const totalIncentivePotential = totalBottomline * incentivePct

  // Already-targeted rep IDs or names (to disable them in selector when adding new)
  const targetedRepKeys = new Set([
    ...targets.map((t) => t.salesperson_id),
    ...targets.map((t) => t.salesperson_name.toLowerCase()),
  ])

  // ─── CRUD handlers ────────────────────────────────────────────────────────

  const handleRepSelect = (userId: string) => {
    const rep = salesReps.find((r) => r.id === userId)
    if (!rep) return
    setForm((f) => ({
      ...f,
      salesperson_id: rep.id,
      salesperson_name: rep.full_name,
    }))
  }

  const handleEdit = (t: SalesTarget) => {
    setForm({ ...t })
    setEditingId(t.id)
    setShowForm(true)
  }

  const handleNew = () => {
    setForm(emptyForm(currentFY))
    setEditingId(null)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({})
  }

  const handleSave = async () => {
    if (!form.salesperson_id?.trim()) return toast.error('Please select a sales representative')
    if (!form.topline_target || form.topline_target <= 0) return toast.error('Revenue target must be greater than 0')
    setSaving(true)
    try {
      await saveTarget({
        id: editingId ?? undefined,
        salesperson_id: form.salesperson_id!,
        salesperson_name: form.salesperson_name!,
        financial_year: form.financial_year || currentFY,
        topline_target: Number(form.topline_target),
        region: form.region || '',
        is_active: form.is_active !== false,
      })
      toast.success(editingId ? 'Target updated' : 'Target added')
      handleCancel()
      load()
    } catch {
      toast.error('Failed to save target')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove target for ${name}?`)) return
    try {
      await deleteTarget(id)
      toast.success('Target removed')
      load()
    } catch {
      toast.error('Failed to remove target')
    }
  }

  // Sales reps available to add (not already targeted — only when adding new)
  const availableReps = editingId
    ? salesReps
    : salesReps.filter(
        (r) =>
          !targetedRepKeys.has(r.id) &&
          !targetedRepKeys.has(r.full_name.toLowerCase())
      )

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/25">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Sales Targets</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentFY} · {targets.filter(t => t.is_active).length} active reps configured
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} className="h-9 gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleNew}
            className="h-9 gap-2"
            disabled={availableReps.length === 0 && !editingId}
            title={availableReps.length === 0 && !editingId ? 'All sales reps already have targets' : undefined}
          >
            <Plus className="h-4 w-4" />
            Add Target
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Revenue Target',
            value: formatCurrency(totalTopline),
            sub: `${targets.filter(t => t.is_active).length} sales reps`,
            color: 'text-violet-600',
            bg: 'bg-violet-50 border-violet-100',
            icon: IndianRupee,
          },
          {
            label: `Bottom Line Target (${(bottomLinePct * 100).toFixed(0)}%)`,
            value: formatCurrency(totalBottomline),
            sub: 'Auto-computed from top line',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 border-emerald-100',
            icon: TrendingUp,
          },
          {
            label: `Incentive Potential (${(incentivePct * 100).toFixed(0)}%)`,
            value: formatCurrency(totalIncentivePotential),
            sub: 'If 100% target achieved',
            color: 'text-amber-600',
            bg: 'bg-amber-50 border-amber-100',
            icon: TrendingUp,
          },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border ${card.bg} p-4 flex items-start gap-3`}>
            <div className="h-9 w-9 rounded-lg bg-white/80 border border-white flex items-center justify-center shrink-0">
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{card.label}</p>
              <p className={`text-xl font-bold font-display mt-0.5 ${card.color}`}>{card.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            {editingId ? 'Edit Target' : 'Add Target for Sales Rep'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Sales Rep Selector */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs font-semibold">Sales Representative *</Label>
              {editingId ? (
                // When editing — show the rep name as read-only (can't reassign)
                <div className="h-9 flex items-center gap-2 px-3 rounded-md border border-border/60 bg-muted/20 text-sm font-semibold text-foreground">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                    {form.salesperson_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  {form.salesperson_name}
                </div>
              ) : availableReps.length === 0 ? (
                <div className="h-9 flex items-center px-3 rounded-md border border-dashed border-border text-xs text-muted-foreground bg-muted/10">
                  All sales reps already have targets set
                </div>
              ) : (
                <select
                  value={form.salesperson_id || ''}
                  onChange={(e) => handleRepSelect(e.target.value)}
                  className="w-full h-9 px-3 border border-border rounded-md bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                >
                  <option value="" disabled>— Select a sales rep —</option>
                  {availableReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.full_name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[10px] text-muted-foreground">
                {editingId ? 'Rep cannot be changed — delete and recreate to reassign.' : 'Only active sales reps without an existing target are shown.'}
              </p>
            </div>

            {/* Region / Segment */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Region / Segment</Label>
              <Input
                value={form.region || ''}
                onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                placeholder="e.g. Corporate – South"
                className="h-9 text-sm"
              />
            </div>

            {/* Financial Year */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Financial Year</Label>
              <Input
                value={form.financial_year || currentFY}
                onChange={(e) => setForm((f) => ({ ...f, financial_year: e.target.value }))}
                placeholder="FY 2026-27"
                className="h-9 text-sm"
              />
            </div>

            {/* Revenue Target */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Revenue Target (₹) *</Label>
              <Input
                type="number"
                value={form.topline_target || ''}
                onChange={(e) => setForm((f) => ({ ...f, topline_target: Number(e.target.value) }))}
                onFocus={(e) => e.target.select()}
                placeholder="e.g. 30000000"
                className="h-9 text-sm font-mono"
              />
              {form.topline_target ? (
                <p className="text-[10px] text-muted-foreground">{formatCurrency(Number(form.topline_target))}</p>
              ) : null}
            </div>

            {/* Auto-computed: Bottom Line */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Bottom Line Target (auto {(bottomLinePct * 100).toFixed(0)}%)
              </Label>
              <div className="h-9 flex items-center px-3 rounded-md border border-border/60 bg-muted/20 text-sm font-mono text-muted-foreground">
                {form.topline_target ? formatCurrency(Number(form.topline_target) * bottomLinePct) : '—'}
              </div>
            </div>

            {/* Auto-computed: Incentive Potential */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Incentive Potential (auto {(incentivePct * 100).toFixed(0)}%)
              </Label>
              <div className="h-9 flex items-center px-3 rounded-md border border-border/60 bg-muted/20 text-sm font-mono text-muted-foreground">
                {form.topline_target
                  ? formatCurrency(Number(form.topline_target) * bottomLinePct * incentivePct)
                  : '—'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || (!editingId && !form.salesperson_id)}
              className="h-8 gap-2"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save Target'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} className="h-8 gap-2">
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Targets Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            Targets — {currentFY}
          </span>
          <span className="text-xs text-muted-foreground">{targets.length} records</span>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : targets.length === 0 ? (
          <div className="p-10 text-center">
            <Target className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">No targets set yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Add Target" to set a revenue target for a sales rep.
            </p>
            {salesReps.length === 0 && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                ⚠ No active sales reps found. Go to Users to create sales rep accounts first.
              </p>
            )}
            {salesReps.length > 0 && (
              <Button size="sm" onClick={handleNew} className="mt-4 h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add First Target
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Sales Rep</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">FY</th>
                  <th className="px-4 py-3 text-right">Revenue Target</th>
                  <th className="px-4 py-3 text-right">
                    Bottom Line ({(bottomLinePct * 100).toFixed(0)}%)
                  </th>
                  <th className="px-4 py-3 text-right">Incentive Potential</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {targets.map((t) => {
                  const bl = t.topline_target * bottomLinePct
                  const ip = bl * incentivePct
                  return (
                    <tr key={t.id} className="hover:bg-muted/20 transition-colors text-sm">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {t.salesperson_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-foreground">{t.salesperson_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{t.region || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-100">
                          {t.financial_year}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                        {formatCurrency(t.topline_target)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">
                        {formatCurrency(bl)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-700">
                        {formatCurrency(ip)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                            t.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => handleEdit(t)}
                            title="Edit target"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-500"
                            onClick={() => handleDelete(t.id, t.salesperson_name)}
                            title="Remove target"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Company Total footer */}
              <tfoot className="border-t-2 border-border/60 bg-muted/20">
                <tr className="text-sm font-bold">
                  <td className="px-4 py-3 text-foreground uppercase text-xs tracking-wider">
                    Company Total
                  </td>
                  <td colSpan={2} />
                  <td className="px-4 py-3 text-right font-mono text-foreground">
                    {formatCurrency(totalTopline)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-700">
                    {formatCurrency(totalBottomline)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-amber-700">
                    {formatCurrency(totalIncentivePotential)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
