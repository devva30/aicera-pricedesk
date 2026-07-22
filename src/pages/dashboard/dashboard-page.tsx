import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Target,
  ArrowRight,
  Package,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  PauseCircle,
  BarChart2,
  Filter,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { setDeals, setLoading } from '@/store/deals-slice'
import { fetchDeals, fetchQuotes } from '@/services/deals-service'
import { fetchOrders } from '@/services/orders-service'
import { fetchTargets, fetchSettings } from '@/services/targets-service'
import { fetchUsers } from '@/services/users-service'
import { cn, formatCurrency } from '@/lib/utils'
import type { RootState } from '@/store'
import type { Order, SalesTarget, SalesSettings, User } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DealsTable } from '@/components/deals/deals-table'

// ─── Per-order helpers ────────────────────────────────────────────────────────

function safeNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim())
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function orderRevenue(o: Order) {
  return (o?.items ?? []).reduce((s, i) => s + safeNumber(i?.quoted_price) * safeNumber(i?.quantity), 0)
}

function orderMargin(o: Order) {
  return (o?.items ?? []).reduce((s, i) => s + (safeNumber(i?.quoted_price) - safeNumber(i?.transfer_price)) * safeNumber(i?.quantity), 0)
}

const formatChartCurrency = (value: number) => {
  return formatCurrency(value, 'INR')
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  progressPct?: number
  progressColor?: string
  badgeText?: string
  badgeIcon?: React.ComponentType<{ className?: string }>
  badgeColor?: string
  accentColor?: string
  iconColor?: string
  iconBg?: string
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
}

function KpiCard({
  label,
  value,
  sub,
  progressPct,
  progressColor = 'from-primary to-violet-500',
  badgeText,
  badgeIcon: BadgeIcon,
  badgeColor = 'bg-primary/10 text-primary border-primary/20',
  accentColor = 'border-t-primary',
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10 border-primary/20',
  icon: Icon,
  loading,
}: KpiCardProps) {
  if (loading) return <div className="h-28 bg-card border border-border/60 rounded-2xl animate-pulse shadow-sm" />
  return (
    <div className={cn(
      "bg-card border border-border/70 border-t-2 rounded-2xl p-3.5 sm:p-4.5 shadow-xs hover:shadow-md transition-all duration-300 group relative overflow-hidden flex flex-col justify-between",
      accentColor
    )}>
      <div>
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest leading-tight">
              {label}
            </p>
            <div className="flex items-baseline gap-1.5 sm:gap-2 mt-1 flex-wrap">
              <span className="text-lg sm:text-2xl font-black font-mono tracking-tight text-foreground break-all sm:break-normal">
                {value}
              </span>
              {badgeText && (
                <span className={cn("inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs", badgeColor)}>
                  {BadgeIcon && <BadgeIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />}
                  {badgeText}
                </span>
              )}
            </div>
            {sub && (
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium mt-1 truncate">
                {sub}
              </p>
            )}
          </div>
          <div className={cn("p-2 sm:p-2.5 rounded-xl border shadow-2xs shrink-0 flex items-center justify-center transition-transform group-hover:scale-105", iconBg)}>
            <Icon className={cn("h-4 w-4 sm:h-4.5 sm:w-4.5", iconColor)} />
          </div>
        </div>
      </div>

      {/* Optional micro progress bar */}
      {typeof progressPct === 'number' && (
        <div className="mt-3.5 pt-1">
          <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out", progressColor)}
              style={{ width: `${Math.min(Math.max(progressPct, 0), 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Month label helper ────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FY_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

function getFYFromDate(dateStr: string): string {
  if (!dateStr) return 'FY 2026-27'
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() // 0 = Jan, 11 = Dec
  if (month < 3) {
    return `FY ${year - 1}-${(year).toString().slice(-2)}`
  } else {
    return `FY ${year}-${(year + 1).toString().slice(-2)}`
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const dispatch = useDispatch()
  const { deals } = useSelector((s: RootState) => s.deals)
  const [orders, setOrders] = useState<Order[]>([])
  const [targets, setTargets] = useState<SalesTarget[]>([])
  const [settings, setSettings] = useState<SalesSettings | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  const [filterFY, setFilterFY] = useState<string>('all')
  const [filterSalesperson, setFilterSalesperson] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState<string>('all')

  const isSalesRep = user?.role === 'sales_rep'
  const canSeeAll = user?.role === 'admin' || user?.role === 'sales_head' || user?.role === 'ops'

  // Dynamic filter drop-down data lists
  const salespeopleList = useMemo(() => {
    const reps = new Map<string, string>() // id -> name
    allUsers
      .filter((u) => u.role === 'sales_rep')
      .forEach((u) => reps.set(u.id, u.full_name))
    targets.forEach((t) => { if (t.salesperson_id && t.salesperson_name) reps.set(t.salesperson_id, t.salesperson_name) })
    orders.forEach((o) => { if (o.sales_rep_id && o.sales_rep_name) reps.set(o.sales_rep_id, o.sales_rep_name) })
    return Array.from(reps.entries()).map(([id, name]) => ({ id, name }))
  }, [allUsers, targets, orders])

  const fyList = useMemo(() => {
    const fys = new Set<string>()
    targets.forEach((t) => { if (t.financial_year) fys.add(t.financial_year) })
    orders.forEach((o) => { if (o.created_at) fys.add(getFYFromDate(o.created_at)) })
    if (fys.size === 0) fys.add('FY 2026-27')
    return Array.from(fys).sort()
  }, [targets, orders])



  // ─── Filtered Data Lists ───────────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    if (!user) return []
    return (orders || []).filter((o) => {
      if (!o) return false
      // Salesperson filter
      if (isSalesRep) {
        if (o.sales_rep_id !== user.id && o.sales_rep_name !== user.full_name) return false
      } else if (filterSalesperson !== 'all') {
        if (o.sales_rep_id !== filterSalesperson && o.sales_rep_name !== filterSalesperson) return false
      }

      // FY filter
      if (filterFY !== 'all') {
        if (getFYFromDate(o.created_at) !== filterFY) return false
      }

      // Month filter
      if (filterMonth !== 'all') {
        if (!o.created_at) return false
        const d = new Date(o.created_at)
        if (isNaN(d.getTime())) return false
        const orderMonth = MONTHS[d.getMonth()]
        if (orderMonth !== filterMonth) return false
      }

      return true
    })
  }, [orders, isSalesRep, user, filterSalesperson, filterFY, filterMonth])

  const filteredTargets = useMemo(() => {
    if (!user) return []
    return (targets || []).filter((t) => {
      if (!t || !t.is_active) return false

      // Salesperson filter
      if (isSalesRep) {
        if (t.salesperson_id !== user.id && t.salesperson_name !== user.full_name) return false
      } else if (filterSalesperson !== 'all') {
        if (t.salesperson_id !== filterSalesperson && t.salesperson_name !== filterSalesperson) return false
      }

      // FY filter
      if (filterFY !== 'all') {
        if (t.financial_year !== filterFY) return false
      }

      return true
    })
  }, [targets, isSalesRep, user, filterSalesperson, filterFY])

  const filteredDeals = useMemo(() => {
    if (!user) return []
    return (deals || []).filter((d) => {
      if (!d) return false
      // Salesperson filter
      if (isSalesRep) {
        if (d.created_by !== user.id) return false
      } else if (filterSalesperson !== 'all') {
        if (d.created_by !== filterSalesperson) return false
      }

      // FY filter
      if (filterFY !== 'all') {
        if (getFYFromDate(d.created_at) !== filterFY) return false
      }

      // Month filter
      if (filterMonth !== 'all') {
        if (!d.created_at) return false
        const date = new Date(d.created_at)
        if (isNaN(date.getTime())) return false
        const dealMonth = MONTHS[date.getMonth()]
        if (dealMonth !== filterMonth) return false
      }

      return true
    })
  }, [deals, isSalesRep, user, filterSalesperson, filterFY, filterMonth])

  const actualDeals = useMemo(() => filteredDeals.filter((d) => !d.is_quote_only), [filteredDeals])
  const quoteDeals = useMemo(() => filteredDeals.filter((d) => d.is_quote_only), [filteredDeals])

  useEffect(() => {
    if (!user?.role || !user?.id) return
    const load = async () => {
      dispatch(setLoading(true))
      try {
        const [dealsList, quotesList] = await Promise.all([
          fetchDeals(user.role, user.id),
          fetchQuotes(user.role, user.id),
        ])
        dispatch(setDeals([...(dealsList || []), ...(quotesList || [])]))
      } catch (err: any) {
        toast.error(err.message || 'Failed to load deals and quotes')
      } finally {
        dispatch(setLoading(false))
      }
    }
    load()
  }, [user, dispatch])

  useEffect(() => {
    if (!user?.role || !user?.id) return
    const load = async () => {
      setOrdersLoading(true)
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
      } catch (err: any) { console.error(err) } finally { setOrdersLoading(false) }
    }
    load()
  }, [user])

  // ─── Incentive computations ───────────────────────────────────────────────

  const bottomLinePct = settings?.bottom_line_pct ?? 0.08
  const incentivePct = settings?.incentive_pct ?? 0.05

  const targetMultiplier = filterMonth === 'all' ? 1 : 1 / 12

  const totalToplineTarget = filteredTargets.reduce((s, t) => s + t.topline_target, 0) * targetMultiplier
  const totalBottomlineTarget = totalToplineTarget * bottomLinePct

  // Revenue Booked, Margin Earned & Incentive Payable only count orders where Sales Ops has
  // ticked all checklist items (order_status === 'Closed').
  const closedOrders = filteredOrders.filter((o) => o.order_status === 'Closed')

  const totalRevenueBooked = closedOrders.reduce((s, o) => s + orderRevenue(o), 0)
  const totalMarginEarned = closedOrders.reduce((s, o) => s + orderMargin(o), 0)
  const totalRevenueToGo = Math.max(totalToplineTarget - totalRevenueBooked, 0)
  const totalMarginToGo = Math.max(totalBottomlineTarget - totalMarginEarned, 0)
  const totalIncentivePayable = totalMarginEarned * incentivePct
  const revenueAchPct = totalToplineTarget > 0 ? (totalRevenueBooked / totalToplineTarget) * 100 : 0
  const marginAchPct = totalBottomlineTarget > 0 ? (totalMarginEarned / totalBottomlineTarget) * 100 : 0

  // ─── Chart data: dynamic salesperson or OEM bar chart ───────────────────────────

  const chartData = useMemo(() => {
    return filteredTargets.map((t) => {
      // Both Rev Booked & Margin Earned count checklist-closed orders only
      const repClosedOrders = closedOrders.filter((o) => o.sales_rep_id === t.salesperson_id || o.sales_rep_name === t.salesperson_name)
      const rev = repClosedOrders.reduce((s, o) => s + orderRevenue(o), 0)
      const margin = repClosedOrders.reduce((s, o) => s + orderMargin(o), 0)
      const name = (t.salesperson_name || 'Sales Rep').split(' ')[0]
      return {
        name,
        'Rev Target': t.topline_target * targetMultiplier,
        'Rev Booked': rev,
        'Margin Target': t.topline_target * bottomLinePct * targetMultiplier,
        'Margin Earned': margin,
      }
    })
  }, [filteredTargets, closedOrders, bottomLinePct, targetMultiplier])

  // ─── Chart data: monthly trend ────────────────────────────────────────────

  const monthlyTrend = useMemo(() => {
    return FY_MONTHS.map((m) => {
      const mIdx = MONTHS.indexOf(m)
      // Both Revenue & Margin count closed (checklist-complete) orders only
      const mClosedOrders = closedOrders.filter((o) => o.created_at && new Date(o.created_at).getMonth() === mIdx)
      return {
        month: m,
        Revenue: mClosedOrders.reduce((s, o) => s + orderRevenue(o), 0),
        Margin: mClosedOrders.reduce((s, o) => s + orderMargin(o), 0),
      }
    })
  }, [closedOrders])

  // ─── Price Desk status counts ─────────────────────────────────────────────

  const pdApproved = quoteDeals.filter((d) => d.status === 'approved').length
  const pdPending = quoteDeals.filter((d) => ['pending_finance', 'pending_technical', 'pending_sales_head'].includes(d.status)).length
  const pdRejected = quoteDeals.filter((d) => d.status === 'rejected').length
  const pdOnHold = quoteDeals.filter((d) => d.status === 'changes_requested').length

  const pdDonutData = [
    { name: 'Approved', value: pdApproved, color: '#10b981' },
    { name: 'Pending', value: pdPending, color: '#f59e0b' },
    { name: 'Rejected', value: pdRejected, color: '#ef4444' },
    { name: 'On Hold', value: pdOnHold, color: '#6366f1' },
  ].filter((d) => d.value > 0)

  // ─── Queue alerts for reviewers ────────────────────────────────────────────

  const queueHref = user?.role === 'finance' ? '/queue/finance' : user?.role === 'technical' ? '/queue/technical' : user?.role === 'sales_head' ? '/queue/sales-head' : null
  const queueCount = user?.role === 'finance'
    ? actualDeals.filter((d) => d.status === 'pending_finance').length
    : user?.role === 'technical' ? actualDeals.filter((d) => d.status === 'pending_technical').length
      : user?.role === 'sales_head' ? actualDeals.filter((d) => d.status === 'pending_sales_head').length : 0

  const showMarginAndIncentive = isSalesRep || ((user?.role === 'admin' || user?.role === 'sales_head') && filterSalesperson !== 'all')

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xl text-primary font-display border border-primary/20 shrink-0">
              {(user?.full_name || 'User').split(' ').map((n) => n[0]).join('').toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Welcome back</span>
                <Badge variant="outline" className="font-semibold text-[10px] py-0.5 px-2 bg-primary/5 text-primary border-primary/20">
                  {user?.role === 'sales_rep' ? 'Sales Rep' : user?.role === 'admin' ? 'Admin' : user?.role === 'sales_head' ? 'Sales Head' : user?.role === 'ops' ? 'Sales Ops' : user?.role || 'Member'}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-foreground mt-1">
                Good {getGreeting()}, {user?.full_name || 'User'}
              </h1>
              {settings && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Active Financial Year: {settings.financial_year}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            {(isSalesRep || user?.role === 'admin') && (
              <Button onClick={() => navigate('/deals/new')} size="sm" className="h-9 px-4 text-xs font-semibold">
                <Plus className="h-4 w-4 mr-1.5" />
                Create New Deal
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Filters control bar ── */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Dashboard Filters</span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {/* FY Filter */}
          <div className="flex flex-col gap-1 w-full sm:w-40">
            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Financial Year</label>
            <select
              value={filterFY}
              onChange={(e) => setFilterFY(e.target.value)}
              className="h-9 w-full px-3 border border-border rounded-lg bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Financial Years</option>
              {fyList.map((fy) => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>

          {/* Salesperson Filter */}
          <div className="flex flex-col gap-1 w-full sm:w-44">
            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Salesperson</label>
            {isSalesRep ? (
              <select
                disabled
                className="h-9 w-full px-3 border border-border rounded-lg bg-muted text-xs font-semibold text-muted-foreground cursor-not-allowed opacity-80"
              >
                <option>{user.full_name}</option>
              </select>
            ) : (
              <select
                value={filterSalesperson}
                onChange={(e) => setFilterSalesperson(e.target.value)}
                className="h-9 w-full px-3 border border-border rounded-lg bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">All Salespersons</option>
                {salespeopleList.map((sp) => (
                  <option key={sp.id} value={sp.id}>{sp.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Month Filter */}
          <div className="flex flex-col gap-1 w-full sm:w-36">
            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="h-9 w-full px-3 border border-border rounded-lg bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Months</option>
              {FY_MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(filterFY !== 'all' || filterSalesperson !== 'all' || filterMonth !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterFY('all')
                setFilterSalesperson('all')
                setFilterMonth('all')
              }}
              className="h-9 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold gap-1"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── Review Queue Alert ── */}
      {queueHref && queueCount > 0 && (
        <div className="bg-primary/5 border border-primary/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Action Required: Pending Approvals</p>
              <p className="text-xs text-muted-foreground mt-0.5">You have {queueCount} deal{queueCount !== 1 ? 's' : ''} awaiting your review.</p>
            </div>
          </div>
          <Button onClick={() => navigate(queueHref)} size="sm" className="h-8 text-xs font-semibold px-4">
            Go to Review Queue
          </Button>
        </div>
      )}

      {/* ── M6 KPI Section (Revenue Row) ── */}
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-violet-500" /> Revenue Performance {filterMonth !== 'all' && '(Monthly Pro-Rata)'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <KpiCard
            label={filterMonth !== 'all' ? 'Pro-Rata Rev Target' : 'Top Line Target'}
            value={formatCurrency(totalToplineTarget)}
            sub={filterFY === 'all' ? 'All Years Target' : filterFY}
            accentColor="border-t-violet-500"
            iconColor="text-violet-600 dark:text-violet-400"
            iconBg="bg-violet-500/10 border-violet-500/20"
            icon={Target}
            loading={ordersLoading}
          />
          <KpiCard
            label="Revenue Booked"
            value={formatCurrency(totalRevenueBooked)}
            sub={`Target: ${formatCurrency(totalToplineTarget)}`}
            badgeText={`${(revenueAchPct ?? 0).toFixed(1)}%`}
            badgeIcon={(revenueAchPct ?? 0) >= 100 ? CheckCircle2 : TrendingUp}
            badgeColor={(revenueAchPct ?? 0) >= 100 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"}
            progressPct={revenueAchPct ?? 0}
            progressColor="from-indigo-500 to-violet-500"
            accentColor="border-t-indigo-500"
            iconColor="text-indigo-600 dark:text-indigo-400"
            iconBg="bg-indigo-500/10 border-indigo-500/20"
            icon={IndianRupee}
            loading={ordersLoading}
          />
          <KpiCard
            label="Revenue To Go"
            value={formatCurrency(totalRevenueToGo)}
            sub={totalRevenueToGo === 0 ? '🎉 Target hit!' : 'Remaining to target'}
            accentColor={totalRevenueToGo === 0 ? 'border-t-emerald-500' : 'border-t-amber-500'}
            iconColor={totalRevenueToGo === 0 ? 'text-emerald-600' : 'text-amber-600'}
            iconBg={totalRevenueToGo === 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}
            icon={totalRevenueToGo === 0 ? TrendingUp : TrendingDown}
            loading={ordersLoading}
          />
          <KpiCard
            label="Revenue Achievement"
            value={`${(revenueAchPct ?? 0).toFixed(1)}%`}
            sub={`of ${formatCurrency(totalToplineTarget)} target`}
            progressPct={revenueAchPct ?? 0}
            progressColor={(revenueAchPct ?? 0) >= 100 ? "from-emerald-500 to-teal-500" : "from-sky-500 to-indigo-500"}
            accentColor={(revenueAchPct ?? 0) >= 100 ? 'border-t-emerald-500' : 'border-t-sky-500'}
            iconColor={(revenueAchPct ?? 0) >= 100 ? 'text-emerald-600' : 'text-sky-600'}
            iconBg={(revenueAchPct ?? 0) >= 100 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-sky-500/10 border-sky-500/20'}
            icon={BarChart2}
            loading={ordersLoading}
          />
        </div>
      </div>

      {/* ── M6 KPI Section (Margin & Incentive Row) ── */}
      {showMarginAndIncentive && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Margin & Incentive
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <KpiCard
              label={filterMonth !== 'all' ? `Pro-Rata Margin Target (${((bottomLinePct ?? 0.08) * 100).toFixed(0)}%)` : `Bottom Line Target (${((bottomLinePct ?? 0.08) * 100).toFixed(0)}%)`}
              value={formatCurrency(totalBottomlineTarget)}
              sub="Auto = Top Line × 8%"
              accentColor="border-t-violet-500"
              iconColor="text-violet-600 dark:text-violet-400"
              iconBg="bg-violet-500/10 border-violet-500/20"
              icon={Target}
              loading={ordersLoading}
            />
            <KpiCard
              label="Margin Earned"
              value={formatCurrency(totalMarginEarned)}
              sub={`Target: ${formatCurrency(totalBottomlineTarget)}`}
              badgeText={`${(marginAchPct ?? 0).toFixed(1)}%`}
              badgeIcon={TrendingUp}
              badgeColor="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              progressPct={marginAchPct ?? 0}
              progressColor="from-emerald-500 to-teal-500"
              accentColor="border-t-emerald-500"
              iconColor="text-emerald-600"
              iconBg="bg-emerald-500/10 border-emerald-500/20"
              icon={TrendingUp}
              loading={ordersLoading}
            />
            <KpiCard
              label="Margin To Go"
              value={formatCurrency(totalMarginToGo)}
              sub={totalMarginToGo === 0 ? '🎉 Target hit!' : 'Remaining to margin target'}
              accentColor={totalMarginToGo === 0 ? 'border-t-emerald-500' : 'border-t-amber-500'}
              iconColor={totalMarginToGo === 0 ? 'text-emerald-600' : 'text-amber-600'}
              iconBg={totalMarginToGo === 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}
              icon={totalMarginToGo === 0 ? TrendingUp : TrendingDown}
              loading={ordersLoading}
            />
            <KpiCard
              label={`Incentive Payable (${((incentivePct ?? 0.05) * 100).toFixed(0)}%)`}
              value={formatCurrency(totalIncentivePayable)}
              sub="On actual margin earned"
              accentColor="border-t-emerald-500"
              iconColor="text-emerald-600"
              iconBg="bg-emerald-500/10 border-emerald-500/20"
              icon={IndianRupee}
              loading={ordersLoading}
            />
          </div>
        </div>
      )}

      {/* ── M6 KPI Section (Operations & Pipeline Row) ── */}
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-sky-500" /> Operations & Pipeline
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <KpiCard
            label="Pending Quotes"
            value={String(pdPending)}
            sub="Awaiting approval"
            accentColor="border-t-amber-500"
            iconColor="text-amber-600"
            iconBg="bg-amber-500/10 border-amber-500/20"
            icon={Clock}
            loading={ordersLoading}
          />
          <KpiCard
            label="Pending Orders"
            value={String(filteredOrders.filter((o) => o.order_status !== 'Closed').length)}
            sub="Checklist incomplete"
            accentColor="border-t-sky-500"
            iconColor="text-sky-600"
            iconBg="bg-sky-500/10 border-sky-500/20"
            icon={RefreshCw}
            loading={ordersLoading}
          />
          <KpiCard
            label="Completed Orders"
            value={String(filteredOrders.filter((o) => o.order_status === 'Closed').length)}
            sub="Checklist closed (100%)"
            accentColor="border-t-emerald-500"
            iconColor="text-emerald-600"
            iconBg="bg-emerald-500/10 border-emerald-500/20"
            icon={CheckCircle2}
            loading={ordersLoading}
          />
          <KpiCard
            label="Total Orders"
            value={String(filteredOrders.length)}
            sub="Active & closed register"
            accentColor="border-t-indigo-500"
            iconColor="text-indigo-600"
            iconBg="bg-indigo-500/10 border-indigo-500/20"
            icon={Package}
            loading={ordersLoading}
          />
        </div>
      </div>

      {/* ── Charts ── */}
      {!ordersLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Chart 1: Revenue — Target vs Booked */}
          {chartData.length > 0 ? (
            <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sales Performance</p>
                <p className="text-base font-bold text-foreground mt-0.5">Revenue: Target vs Booked</p>
              </div>
              <div className="px-1 pb-4">
                <ResponsiveContainer width="100%" height={240} debounce={50}>
                  <BarChart data={chartData} barGap={3} barCategoryGap="30%" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#475569" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#475569" stopOpacity={0.5} />
                      </linearGradient>
                      <linearGradient id="bookedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatChartCurrency} width={72} />
                    <Tooltip
                      formatter={(val: any, name: any) => [formatChartCurrency(Number(val)), String(name)]}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', fontSize: 12, borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                      labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }}>{value}</span>}
                      iconType="circle"
                      iconSize={7}
                      wrapperStyle={{ paddingTop: 8 }}
                    />
                    <Bar dataKey="Rev Target" name="Revenue Target" fill="url(#targetGrad)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="Rev Booked" name="Revenue Booked" fill="url(#bookedGrad)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border/60 rounded-2xl shadow-sm flex flex-col items-center justify-center min-h-[280px] gap-2">
              <BarChart2 className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground font-medium">No performance data available</p>
            </div>
          )}

          {/* Chart 2: Margin — Target vs Earned */}
          {chartData.length > 0 ? (
            <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Margin Performance</p>
                <p className="text-base font-bold text-foreground mt-0.5">Margin Quota: Target vs Earned</p>
              </div>
              <div className="px-1 pb-4">
                <ResponsiveContainer width="100%" height={240} debounce={50}>
                  <BarChart data={chartData} layout="vertical" barGap={3} barCategoryGap="30%" margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mTargetGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#475569" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#475569" stopOpacity={0.5} />
                      </linearGradient>
                      <linearGradient id="mEarnedGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" strokeOpacity={0.5} horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatChartCurrency} />
                    <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip
                      formatter={(val: any, name: any) => [formatChartCurrency(Number(val)), String(name)]}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', fontSize: 12, borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                      labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }}>{value}</span>}
                      iconType="circle"
                      iconSize={7}
                      wrapperStyle={{ paddingTop: 8 }}
                    />
                    <Bar dataKey="Margin Target" name="Margin Target" fill="url(#mTargetGrad)" radius={[0, 4, 4, 0]} maxBarSize={16} />
                    <Bar dataKey="Margin Earned" name="Margin Earned" fill="url(#mEarnedGrad)" radius={[0, 4, 4, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border/60 rounded-2xl shadow-sm flex flex-col items-center justify-center min-h-[280px] gap-2">
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground font-medium">No margin data available</p>
            </div>
          )}

          {/* Chart 3: Monthly Revenue & Margin Trend */}
          <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">FY Monthly Trend</p>
              <p className="text-base font-bold text-foreground mt-0.5">Revenue & Margin by Month</p>
            </div>
            <div className="px-1 pb-4">
              <ResponsiveContainer width="100%" height={240} debounce={50}>
                <LineChart data={monthlyTrend} margin={{ top: 8, right: 20, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lineRevArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="lineMarginArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatChartCurrency} width={72} />
                  <Tooltip
                    formatter={(val: any, name: any) => [formatChartCurrency(Number(val)), String(name)]}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', fontSize: 12, borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                    labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                    cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Legend
                    formatter={(value) => <span style={{ color: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }}>{value}</span>}
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ paddingTop: 8 }}
                  />
                  <Line type="monotone" dataKey="Revenue" name="Revenue Booked" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: '#6366f1' }} />
                  <Line type="monotone" dataKey="Margin" name="Margin Earned" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: '#10b981' }} strokeDasharray="6 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Price Desk — Quote Approvals Donut */}
          <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Price Desk</p>
              <p className="text-base font-bold text-foreground mt-0.5">Quote Approvals Pipeline</p>
            </div>
            <div className="px-5 pb-5">
              {pdDonutData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <ResponsiveContainer width={160} height={160} debounce={50}>
                      <PieChart>
                        <Pie
                          data={pdDonutData}
                          cx="50%" cy="50%"
                          innerRadius={52} outerRadius={72}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {pdDonutData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v, n) => [`${v} quotes`, n]}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12, borderRadius: 10, padding: '8px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-foreground">{pdDonutData.reduce((s, d) => s + d.value, 0)}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Quotes</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2.5">
                    {[
                      { label: 'Approved', count: pdApproved, color: '#10b981', textColor: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50/60 dark:bg-emerald-950/20' },
                      { label: 'Pending', count: pdPending, color: '#f59e0b', textColor: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50/60 dark:bg-amber-950/20' },
                      { label: 'Rejected', count: pdRejected, color: '#ef4444', textColor: 'text-red-600 dark:text-red-400', bg: 'bg-red-50/60 dark:bg-red-950/20' },
                      { label: 'On Hold', count: pdOnHold, color: '#6366f1', textColor: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50/60 dark:bg-violet-950/20' },
                    ].map((s) => {
                      const total = pdDonutData.reduce((sum, d) => sum + d.value, 0)
                      const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
                      return (
                        <div key={s.label}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                              <span className="text-[11px] font-medium text-muted-foreground">{s.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[11px] font-bold ${s.textColor}`}>{s.count}</span>
                              <span className="text-[9px] text-muted-foreground font-mono">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <PauseCircle className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No quote data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Orders Overview ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold font-display text-foreground">Orders Overview</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/orders')} className="h-8 text-xs font-semibold">
              My Orders <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
        {ordersLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse shadow-sm" />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
            <Package className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground font-medium">No active orders found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Orders', value: filteredOrders.length, color: 'text-foreground' },
              {
                label: 'Checklist Pending',
                value: filteredOrders.filter((o) => o.order_status !== 'Closed').length,
                color: 'text-amber-600',
              },
              {
                label: 'In Progress',
                value: filteredOrders.filter((o) => o.pct_complete > 0 && o.order_status !== 'Closed').length,
                color: 'text-sky-600',
              },
              {
                label: 'Closed',
                value: filteredOrders.filter((o) => o.order_status === 'Closed').length,
                color: 'text-emerald-600',
              },
            ].map((card) => (
              <div key={card.label} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── My Deals ── */}
      {(isSalesRep || canSeeAll) && (
        <>
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <h2 className="text-lg font-bold font-display text-foreground">My Deals</h2>
          </div>
          <DealsTable deals={actualDeals.slice(0, canSeeAll ? 20 : 10)} showCreator={!isSalesRep} />
        </>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
