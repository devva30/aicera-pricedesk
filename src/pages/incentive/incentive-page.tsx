import { useEffect, useState, useMemo } from 'react'
import {
  TrendingUp,
  RefreshCw,
  IndianRupee,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { fetchOrders } from '@/services/orders-service'
import { fetchTargets, fetchSettings } from '@/services/targets-service'
import { fetchUsers } from '@/services/users-service'
import type { Order, SalesTarget, SalesSettings, IncentiveRow, User as UserProfile } from '@/types'
import { formatCurrency } from '@/lib/utils'

// ─── Per-order margin helpers ─────────────────────────────────────────────────

function safeNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim())
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function orderRevenue(order: Order): number {
  return (order?.items ?? []).reduce((s, i) => s + safeNumber(i?.quoted_price) * safeNumber(i?.quantity), 0)
}

function orderCost(order: Order): number {
  return (order?.items ?? []).reduce((s, i) => s + safeNumber(i?.transfer_price) * safeNumber(i?.quantity), 0)
}

function orderMargin(order: Order): number {
  return orderRevenue(order) - orderCost(order)
}

function isOrderClosed(order: Order): boolean {
  return order.order_status === 'Closed'
}

// ─── Build per-rep incentive rows ─────────────────────────────────────────────

function buildIncentiveRows(
  targets: SalesTarget[],
  orders: Order[],
  settings: SalesSettings,
  filterRepId?: string
): { rows: IncentiveRow[]; totals: IncentiveRow } {
  const { bottom_line_pct, incentive_pct } = settings

  const rows: IncentiveRow[] = targets
    .filter((t) => t.is_active && (!filterRepId || t.salesperson_id === filterRepId || t.salesperson_name === filterRepId))
    .map((t) => {
      const repOrders = orders.filter(
        (o) => (o.sales_rep_id === t.salesperson_id || o.sales_rep_name === t.salesperson_name) && isOrderClosed(o)
      )
      const revenue_booked = repOrders.reduce((s, o) => s + orderRevenue(o), 0)
      const margin_earned = repOrders.reduce((s, o) => s + orderMargin(o), 0)
      const bottomline_target = t.topline_target * bottom_line_pct
      const revenue_to_go = Math.max(t.topline_target - revenue_booked, 0)
      const margin_to_go = Math.max(bottomline_target - margin_earned, 0)
      const incentive_payable = margin_earned * incentive_pct

      return {
        salesperson_id: t.salesperson_id,
        salesperson_name: t.salesperson_name,
        topline_target: t.topline_target,
        revenue_booked,
        revenue_to_go,
        revenue_ach_pct: t.topline_target > 0 ? revenue_booked / t.topline_target : 0,
        bottomline_target,
        margin_earned,
        margin_to_go,
        margin_ach_pct: bottomline_target > 0 ? margin_earned / bottomline_target : 0,
        incentive_payable,
      }
    })

  const totals: IncentiveRow = {
    salesperson_id: '__total__',
    salesperson_name: 'COMPANY TOTAL',
    topline_target: rows.reduce((s, r) => s + r.topline_target, 0),
    revenue_booked: rows.reduce((s, r) => s + r.revenue_booked, 0),
    revenue_to_go: rows.reduce((s, r) => s + r.revenue_to_go, 0),
    revenue_ach_pct: 0,
    bottomline_target: rows.reduce((s, r) => s + r.bottomline_target, 0),
    margin_earned: rows.reduce((s, r) => s + r.margin_earned, 0),
    margin_to_go: rows.reduce((s, r) => s + r.margin_to_go, 0),
    margin_ach_pct: 0,
    incentive_payable: rows.reduce((s, r) => s + r.incentive_payable, 0),
  }
  if (totals.topline_target > 0) totals.revenue_ach_pct = totals.revenue_booked / totals.topline_target
  if (totals.bottomline_target > 0) totals.margin_ach_pct = totals.margin_earned / totals.bottomline_target

  return { rows, totals }
}

// ─── Helper UI pieces ─────────────────────────────────────────────────────────

function AchPct({ pct }: { pct: number }) {
  const p = (pct || 0) * 100
  const color = p >= 100 ? 'text-emerald-600' : p >= 70 ? 'text-amber-600' : 'text-red-500'
  const Icon = p >= 100 ? ArrowUpRight : p >= 70 ? Minus : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-0.5 font-bold font-mono text-xs ${color}`}>
      <Icon className="h-3 w-3" />
      {(p || 0).toFixed(1)}%
    </span>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  const p = Math.min(pct * 100, 100)
  const color = p >= 100 ? 'bg-emerald-500' : p >= 70 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="w-full h-1.5 rounded-full bg-muted/50 overflow-hidden mt-1">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${p}%` }} />
    </div>
  )
}

// ─── Quarterly breakdown helpers ──────────────────────────────────────────────

const FY_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

const QUARTERS = [
  { key: 'Q1', label: 'Q1 (Apr – Jun)', months: [3, 4, 5] },
  { key: 'Q2', label: 'Q2 (Jul – Sep)', months: [6, 7, 8] },
  { key: 'Q3', label: 'Q3 (Oct – Dec)', months: [9, 10, 11] },
  { key: 'Q4', label: 'Q4 (Jan – Mar)', months: [0, 1, 2] },
]

function getQuarterKey(dateStr: string): string | null {
  if (!dateStr) return null
  const m = new Date(dateStr).getMonth()
  for (const q of QUARTERS) {
    if (q.months.includes(m)) return q.key
  }
  return null
}

// ─── Component ───────────────────────────────────────────────────────────────

export function IncentivePage() {
  const user = useAuthStore((s) => s.user)
  const isSalesRep = user?.role === 'sales_rep'
  const canSeeAll = user?.role === 'sales_head' || user?.role === 'admin' || user?.role === 'ops'

  const [orders, setOrders] = useState<Order[]>([])
  const [targets, setTargets] = useState<SalesTarget[]>([])
  const [settings, setSettings] = useState<SalesSettings | null>(null)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showQuarterly, setShowQuarterly] = useState(false)
  const [showMonthly, setShowMonthly] = useState(false)
  const [filterRep, setFilterRep] = useState<string>('all')

  const load = async () => {
    if (!user?.role || !user?.id) return
    setLoading(true)
    try {
      const [o, t, s, uList] = await Promise.all([
        fetchOrders(user.role, user.id),
        fetchTargets(user.role),
        Promise.resolve(fetchSettings()),
        fetchUsers(),
      ])
      setOrders(o || [])
      setTargets(t || [])
      setSettings(s || null)
      setAllUsers(uList || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role && user?.id) {
      load()
    }
  }, [user])

  // For sales rep, show only their own row by matching name or id
  const effectiveFilter = isSalesRep ? user?.full_name : (filterRep === 'all' ? undefined : filterRep)

  const { rows, totals } = useMemo(() => {
    if (!settings || targets.length === 0) {
      return { rows: [], totals: null as unknown as IncentiveRow }
    }
    return buildIncentiveRows(targets, orders, settings, effectiveFilter)
  }, [targets, orders, settings, effectiveFilter])

  const incentivePct = settings?.incentive_pct ?? 0.05
  const bottomLinePct = settings?.bottom_line_pct ?? 0.08

  // Quarterly breakdown for "my orders" (all orders if admin/head, own if rep)
  const myOrders = (isSalesRep
    ? orders.filter((o) => (user?.id && o.sales_rep_id === user.id) || (user?.full_name && o.sales_rep_name === user.full_name))
    : filterRep !== 'all'
    ? orders.filter((o) => o.sales_rep_name === filterRep)
    : orders
  ).filter(isOrderClosed)

  const quarterlyData = useMemo(() => {
    return QUARTERS.map((q) => {
      const qOrders = myOrders.filter((o) => getQuarterKey(o.created_at) === q.key)
      const margin = qOrders.reduce((s, o) => s + orderMargin(o), 0)
      const revenue = qOrders.reduce((s, o) => s + orderRevenue(o), 0)
      return {
        ...q,
        orderCount: qOrders.length,
        revenue,
        margin,
        incentive: margin * incentivePct,
      }
    })
  }, [myOrders, incentivePct])

  const monthlyIncentives = useMemo(() => {
    return FY_MONTHS.map((m) => {
      const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(m)
      const mOrders = myOrders.filter((o) => {
        if (!o.created_at) return false
        return new Date(o.created_at).getMonth() === monthIndex
      })
      const revenue = mOrders.reduce((s, o) => s + orderRevenue(o), 0)
      const margin = mOrders.reduce((s, o) => s + orderMargin(o), 0)
      const incentive = margin * incentivePct
      return {
        month: m,
        revenue,
        margin,
        incentive,
        count: mOrders.length
      }
    })
  }, [myOrders, incentivePct])

  const repNames = useMemo(() => {
    const names = new Set<string>()
    allUsers.filter((u) => u.role === 'sales_rep').forEach((u) => names.add(u.full_name))
    targets.forEach((t) => names.add(t.salesperson_name))
    orders.forEach((o) => names.add(o.sales_rep_name))
    return Array.from(names)
  }, [allUsers, targets, orders])

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-card border border-border rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-card border border-border rounded-xl animate-pulse" />
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {isSalesRep ? 'Sales Representative' : canSeeAll ? 'Admin View' : ''} · Incentive Engine
            </span>
            <h1 className="text-xl font-bold font-display text-foreground mt-0.5">
              {isSalesRep ? 'My Incentive' : 'Sales Team Incentive Dashboard'}
            </h1>
            {settings && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {settings.financial_year} · Incentive = {(incentivePct * 100).toFixed(0)}% of Gross Margin · Bottom Line = {(bottomLinePct * 100).toFixed(0)}% of Revenue
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canSeeAll && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filterRep}
                onChange={(e) => setFilterRep(e.target.value)}
                className="h-9 px-3 border border-border rounded-lg bg-background text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Reps</option>
                {repNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              {filterRep !== 'all' && (
                <button onClick={() => setFilterRep('all')} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          <Button variant="outline" size="icon" onClick={load} title="Refresh" className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Summary Table (M5 core — mirrors Excel Incentive sheet) ── */}
      {targets.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Target className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">No targets configured yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {canSeeAll ? 'Go to Admin → Targets to set revenue targets for sales reps.' : 'Your admin has not set targets yet. Contact your Sales Head.'}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Revenue & Incentive Summary</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{settings?.financial_year}</span>
          </div>
          <div className="sm:hidden px-3 py-1.5 bg-muted/40 text-[10px] text-muted-foreground flex items-center justify-between border-b border-border/40">
            <span>👈 Swipe horizontally to view full incentive summary 👉</span>
          </div>
          <div className="overflow-x-auto touch-pan-x">
            <table className="w-full text-left border-collapse text-xs min-w-[900px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border/40">
                  <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider sticky left-0 bg-muted/30">Sales Person</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-violet-600 uppercase tracking-wider text-right">Revenue Target</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-violet-600 uppercase tracking-wider text-right">Rev. Booked</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-orange-600 uppercase tracking-wider text-right">Rev. To Go</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Rev. Ach%</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-emerald-600 uppercase tracking-wider text-right">Margin Target</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-emerald-600 uppercase tracking-wider text-right">Margin Earned</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-orange-600 uppercase tracking-wider text-right">Margin To Go</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Margin Ach%</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-amber-600 uppercase tracking-wider text-right">Incentive Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {rows.map((row) => (
                  <tr key={row.salesperson_id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground sticky left-0 bg-card">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {row.salesperson_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span>{row.salesperson_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatCurrency(row.topline_target)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">{formatCurrency(row.revenue_booked)}</td>
                    <td className="px-4 py-3 text-right font-mono text-orange-600">{formatCurrency(row.revenue_to_go)}</td>
                    <td className="px-4 py-3 text-center">
                      <AchPct pct={row.revenue_ach_pct} />
                      <ProgressBar pct={row.revenue_ach_pct} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatCurrency(row.bottomline_target)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">{formatCurrency(row.margin_earned)}</td>
                    <td className="px-4 py-3 text-right font-mono text-orange-600">{formatCurrency(row.margin_to_go)}</td>
                    <td className="px-4 py-3 text-center">
                      <AchPct pct={row.margin_ach_pct} />
                      <ProgressBar pct={row.margin_ach_pct} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">{formatCurrency(row.incentive_payable)}</td>
                  </tr>
                ))}
              </tbody>
              {/* Company Total row */}
              {canSeeAll && totals && (
                <tfoot className="border-t-2 border-border/60 bg-muted/20">
                  <tr className="font-bold">
                    <td className="px-4 py-3 text-foreground text-xs uppercase tracking-wider">COMPANY TOTAL</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatCurrency(totals.topline_target)}</td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">{formatCurrency(totals.revenue_booked)}</td>
                    <td className="px-4 py-3 text-right font-mono text-orange-600">{formatCurrency(totals.revenue_to_go)}</td>
                    <td className="px-4 py-3 text-center"><AchPct pct={totals.revenue_ach_pct} /></td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatCurrency(totals.bottomline_target)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatCurrency(totals.margin_earned)}</td>
                    <td className="px-4 py-3 text-right font-mono text-orange-600">{formatCurrency(totals.margin_to_go)}</td>
                    <td className="px-4 py-3 text-center"><AchPct pct={totals.margin_ach_pct} /></td>
                    <td className="px-4 py-3 text-right font-mono text-amber-700">{formatCurrency(totals.incentive_payable)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── Quarterly Breakdown (collapsible) ── */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <button
          className="w-full px-4 py-3 border-b border-border/50 flex items-center justify-between hover:bg-muted/20 transition-colors"
          onClick={() => setShowQuarterly((v) => !v)}
        >
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Quarterly Breakdown</span>
          {showQuarterly ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showQuarterly && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
            {quarterlyData.map((q) => (
              <div key={q.key} className="p-4 space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{q.label}</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="font-mono font-semibold text-foreground">{formatCurrency(q.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Margin Earned</span>
                    <span className="font-mono font-semibold text-emerald-700">{formatCurrency(q.margin)}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-border/40 pt-1.5">
                    <span className="text-muted-foreground font-semibold">Incentive</span>
                    <span className="font-mono font-bold text-amber-700">{formatCurrency(q.incentive)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{q.orderCount} order{q.orderCount !== 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Monthly Incentive Summary (collapsible) ── */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <button
          className="w-full px-4 py-3 border-b border-border/50 flex items-center justify-between hover:bg-muted/20 transition-colors"
          onClick={() => setShowMonthly((v) => !v)}
        >
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Monthly Incentive Summary</span>
          {showMonthly ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showMonthly && (
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/20 border-b border-border/30">
                    <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase">Month</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase text-right">Orders</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-violet-600 uppercase text-right">Revenue</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-emerald-600 uppercase text-right">Margin</th>
                    <th className="px-3 py-2 text-[10px] font-bold text-amber-600 uppercase text-right">Incentive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {monthlyIncentives.map((m) => (
                    <tr key={m.month} className="hover:bg-muted/5 transition-colors">
                      <td className="px-3 py-2 font-semibold text-foreground">{m.month}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{m.count}</td>
                      <td className="px-3 py-2 text-right font-mono text-foreground">{formatCurrency(m.revenue)}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-700">{formatCurrency(m.margin)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-amber-700">{formatCurrency(m.incentive)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Rule footnote ── */}
      {settings && (
        <p className="text-[10px] text-muted-foreground text-center">
          Rule: Incentive = {(incentivePct * 100).toFixed(0)}% × Gross Margin actually earned (sum of booked orders).
          Full-year incentive potential = {(incentivePct * 100).toFixed(0)}% × Bottom Line Target if 100% achieved.
        </p>
      )}
    </div>
  )
}
