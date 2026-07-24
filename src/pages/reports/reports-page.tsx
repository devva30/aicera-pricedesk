import { useEffect, useState, useMemo } from 'react'
import {
  FileDown,
  Search,
  Building,
  TrendingUp,
  Coins,
  Clock,
  CheckCircle2,
  Briefcase,
  Layers,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { fetchOrders } from '@/services/orders-service'
import { fetchDeals } from '@/services/deals-service'
import { downloadMonthlyReportPDF } from '@/lib/monthly-report-pdf'
import { fetchTargets, fetchSettings } from '@/services/targets-service'
import { fetchUsers } from '@/services/users-service'
import type { Order, SalesTarget, SalesSettings, User as UserProfile } from '@/types'
import { formatCurrency, formatCurrencyCompact, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'

type ReportTab = 'revenue' | 'margin' | 'incentive' | 'sales' | 'pending' | 'completed' | 'business'


export function ReportsPage() {
  const user = useAuthStore((s) => s.user)
  const isSalesRep = user?.role === 'sales_rep'
  const canSeeAll = user?.role === 'admin' || user?.role === 'sales_head' || user?.role === 'ops'

  const [activeTab, setActiveTab] = useState<ReportTab>('revenue')
  const [orders, setOrders] = useState<Order[]>([])
  const [targets, setTargets] = useState<SalesTarget[]>([])
  const [settings, setSettings] = useState<SalesSettings | null>(null)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRep, setFilterRep] = useState<string>('all')

  const tabList = useMemo(() => {
    const isOps = user?.role === 'ops'
    const isRep = user?.role === 'sales_rep'
    if (isOps) {
      return [
        { key: 'revenue', label: 'Revenue Report', icon: Coins },
        { key: 'business', label: 'Business Report', icon: Building },
        { key: 'incentive', label: 'Incentive Report', icon: Coins },
        { key: 'pending', label: 'Pending Orders', icon: Clock },
        { key: 'completed', label: 'Completed Orders', icon: CheckCircle2 },
      ] as const
    }
    if (isRep) {
      return [
        { key: 'revenue', label: 'Revenue Report', icon: Coins },
        { key: 'business', label: 'Business Report', icon: Building },
        { key: 'incentive', label: 'Incentive Report', icon: Coins },
        { key: 'pending', label: 'Pending Orders', icon: Clock },
        { key: 'completed', label: 'Completed Orders', icon: CheckCircle2 },
      ] as const
    }
    return [
      { key: 'revenue', label: 'Revenue Report', icon: Coins },
      { key: 'business', label: 'Business Report', icon: Building },
      { key: 'margin', label: 'Margin Report', icon: TrendingUp },
      { key: 'incentive', label: 'Incentive Report', icon: Coins },
      { key: 'sales', label: 'Sales Report', icon: Briefcase },
      { key: 'pending', label: 'Pending Orders', icon: Clock },
      { key: 'completed', label: 'Completed Orders', icon: CheckCircle2 },
    ] as const
  }, [user?.role])

  const isTabVisible = (tab: ReportTab) => tabList.some((t) => t.key === tab)

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
      console.error('Failed to load report data:', e)
      toast.error('Failed to load report data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role && user?.id) {
      load()
    }
  }, [user])

  // Helper functions
  const orderRevenue = (o: Order) => o.items.reduce((s, i) => s + i.quoted_price * i.quantity, 0)
  const orderCost = (o: Order) => o.items.reduce((s, i) => s + i.transfer_price * i.quantity, 0)
  const orderMargin = (o: Order) => orderRevenue(o) - orderCost(o)

  const isOrderCompleted = (o: Order) => {
    return o.order_status === 'Closed'
  }

  const getPoDisplayNumber = (o: Order) => {
    if (o.po_number && o.po_number.trim() && !o.po_number.startsWith('PO-2026-')) return o.po_number
    if (o.vendor_po_number && o.vendor_po_number.trim()) return o.vendor_po_number
    if (o.customer_po_file?.name) return o.customer_po_file.name
    return '—'
  }

  // Filtered orders & targets
  const myOrders = useMemo(() => {
    let list = orders
    if (isSalesRep) {
      list = list.filter((o) => o.sales_rep_id === user.id || o.sales_rep_name === user.full_name)
    } else if (filterRep !== 'all') {
      list = list.filter((o) => o.sales_rep_name === filterRep || o.sales_rep_id === filterRep)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (o) =>
          o.customer_name.toLowerCase().includes(q) ||
          getPoDisplayNumber(o).toLowerCase().includes(q) ||
          o.sales_rep_name.toLowerCase().includes(q)
      )
    }
    return list
  }, [orders, isSalesRep, filterRep, searchQuery, user])

  const myTargets = useMemo(() => {
    let list = targets
    if (isSalesRep) {
      list = list.filter((t) => t.salesperson_id === user.id || t.salesperson_name === user.full_name)
    } else if (filterRep !== 'all') {
      list = list.filter((t) => t.salesperson_name === filterRep || t.salesperson_id === filterRep)
    }
    return list
  }, [targets, isSalesRep, filterRep, user])

  const repNames = useMemo(() => {
    const names = new Set<string>()
    allUsers.filter((u) => u.role === 'sales_rep').forEach((u) => names.add(u.full_name))
    targets.forEach((t) => names.add(t.salesperson_name))
    orders.forEach((o) => names.add(o.sales_rep_name))
    return Array.from(names)
  }, [allUsers, targets, orders])

  // Incentive calculation configurations
  const incentivePct = settings?.incentive_pct ?? 0.05
  const bottomLinePct = settings?.bottom_line_pct ?? 0.08

  // Export CSV Handler
  const handleExportCSV = () => {
    let csvContent = ''
    let filename = `Report_${activeTab}.csv`

    if (activeTab === 'revenue') {
      const headers = ['Order Number', 'Date', 'Customer', 'Sales Rep', 'PO Number', 'Revenue (INR)']
      const rows = myOrders.map((o) => [
        o.order_number,
        o.created_at ? formatDate(o.created_at) : '—',
        o.customer_name,
        o.sales_rep_name,
        getPoDisplayNumber(o),
        orderRevenue(o),
      ])
      const totalRev = myOrders.reduce((s, o) => s + orderRevenue(o), 0)
      csvContent = [headers, ...rows, ['', '', '', 'TOTAL', '', totalRev]]
        .map((e) => e.join(','))
        .join('\n')
    } else if (activeTab === 'margin') {
      const headers = ['Order Number', 'Customer', 'Revenue', 'Cost', 'Margin', 'Margin %']
      const rows = myOrders.map((o) => {
        const r = orderRevenue(o)
        const c = orderCost(o)
        const m = r - c
        const pct = r > 0 ? (m / r) * 100 : 0
        return [o.order_number, o.customer_name, r, c, m, `${(pct || 0).toFixed(1)}%`]
      })
      const totalRev = myOrders.reduce((s, o) => s + orderRevenue(o), 0)
      const totalCost = myOrders.reduce((s, o) => s + orderCost(o), 0)
      const totalMargin = totalRev - totalCost
      const totalPct = totalRev > 0 ? (totalMargin / totalRev) * 100 : 0
      csvContent = [
        headers,
        ...rows,
        ['', 'TOTAL', totalRev, totalCost, totalMargin, `${(totalPct || 0).toFixed(1)}%`],
      ]
        .map((e) => e.join(','))
        .join('\n')
    } else if (activeTab === 'incentive') {
      const headers = [
        'Sales Person',
        'Revenue Target',
        'Revenue Booked',
        'Margin Target',
        'Margin Earned',
        'Incentive Payable',
      ]
      const rows = myTargets.map((t) => {
        const repOrders = orders.filter(
          (o) => (o.sales_rep_id === t.salesperson_id || o.sales_rep_name === t.salesperson_name) && isOrderCompleted(o)
        )
        const rev = repOrders.reduce((s, o) => s + orderRevenue(o), 0)
        const margin = repOrders.reduce((s, o) => s + orderMargin(o), 0)
        const marginTarget = t.topline_target * bottomLinePct
        const incentive = margin * incentivePct
        return [t.salesperson_name, t.topline_target, rev, marginTarget, margin, incentive]
      })
      csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n')
    } else if (activeTab === 'sales') {
      const headers = ['Sales Person', 'Target FY Revenue', 'Total Orders', 'Revenue Achieved', 'Margin Achieved']
      const rows = myTargets.map((t) => {
        const repOrders = orders.filter(
          (o) => (o.sales_rep_id === t.salesperson_id || o.sales_rep_name === t.salesperson_name) && isOrderCompleted(o)
        )
        const rev = repOrders.reduce((s, o) => s + orderRevenue(o), 0)
        const margin = repOrders.reduce((s, o) => s + orderMargin(o), 0)
        return [t.salesperson_name, t.topline_target, repOrders.length, rev, margin]
      })
      csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n')
    } else if (activeTab === 'pending') {
      const pendingOrders = myOrders.filter((o) => !isOrderCompleted(o))
      const headers = ['Order Number', 'Customer', 'PO Number', 'Expected Delivery', 'Completed Gates']
      const rows = pendingOrders.map((o) => {
        const completedGatesCount = o.checklist ? Object.values(o.checklist).filter(Boolean).length : 0
        return [
          o.order_number,
          o.customer_name,
          getPoDisplayNumber(o),
          o.expected_delivery_date || '—',
          `${completedGatesCount}/10`,
        ]
      })
      csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n')
    } else if (activeTab === 'completed') {
      const completedOrders = myOrders.filter((o) => isOrderCompleted(o))
      const headers = ['Order Number', 'Customer', 'PO Number', 'Expected Delivery', 'Execution Status']
      const rows = completedOrders.map((o) => [
        o.order_number,
        o.customer_name,
        getPoDisplayNumber(o),
        o.expected_delivery_date || '—',
        'Completed',
      ])
      csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n')
    } else if (activeTab === 'business') {
      const headers = canSeeAll
        ? ['Business Account', 'Total Orders', 'Total Revenue (INR)', 'Margin Achieved (INR)']
        : ['Business Account', 'Total Orders', 'Total Revenue (INR)']
      const rows = businessReport.map((b) => canSeeAll
        ? [b.customer, b.orderCount, b.revenue, b.margin]
        : [b.customer, b.orderCount, b.revenue]
      )
      const totalRev = businessReport.reduce((s, b) => s + b.revenue, 0)
      const totalOrders = businessReport.reduce((s, b) => s + b.orderCount, 0)
      const totalMargin = businessReport.reduce((s, b) => s + b.margin, 0)
      csvContent = [
        headers,
        ...rows,
        canSeeAll
          ? ['TOTAL', totalOrders, totalRev, totalMargin]
          : ['TOTAL', totalOrders, totalRev]
      ]
        .map((e) => e.join(','))
        .join('\n')
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Report exported to CSV successfully.')
  }

  // Memoized Report Data calculations
  const totalRevenueSum = useMemo(() => myOrders.reduce((s, o) => s + orderRevenue(o), 0), [myOrders])
  const totalCostSum = useMemo(() => myOrders.reduce((s, o) => s + orderCost(o), 0), [myOrders])
  const totalMarginSum = useMemo(() => totalRevenueSum - totalCostSum, [totalRevenueSum, totalCostSum])
  const averageMarginPct = useMemo(() => (totalRevenueSum > 0 ? (totalMarginSum / totalRevenueSum) * 100 : 0), [totalRevenueSum, totalMarginSum])

  const pendingOrdersList = useMemo(() => myOrders.filter((o) => !isOrderCompleted(o)), [myOrders])
  const completedOrdersList = useMemo(() => myOrders.filter((o) => isOrderCompleted(o)), [myOrders])

  const businessReport = useMemo(() => {
    const map: Record<string, { customer: string; orderCount: number; revenue: number; margin: number }> = {}
    myOrders.forEach((o) => {
      const name = o.customer_name
      const rev = orderRevenue(o)
      const marg = orderMargin(o)
      if (!map[name]) {
        map[name] = { customer: name, orderCount: 0, revenue: 0, margin: 0 }
      }
      map[name].orderCount += 1
      map[name].revenue += rev
      map[name].margin += marg
    })
    return Object.values(map)
  }, [myOrders])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-card border border-border rounded-xl animate-pulse" />
        <div className="h-96 bg-card border border-border rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {isSalesRep ? 'Representative' : 'Operations & Sales'} · Price Desk Register
            </span>
            <h1 className="text-xl font-bold font-display text-foreground mt-0.5">Price Desk & Incentive Reports</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Financial Year {settings?.financial_year || 'FY2026-27'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Customer/PO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 pr-3 w-full border border-border rounded-lg bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
            />
          </div>
          {canSeeAll && (
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={filterRep}
                onChange={(e) => setFilterRep(e.target.value)}
                className="h-9 px-3 border border-border rounded-lg bg-background text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Salespersons</option>
                {repNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!user) return
              const toastId = toast.loading('Generating Monthly Executive PDF Report...')
              try {
                const deals = await fetchDeals(user.role, user.id)
                const currentMonth = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                await downloadMonthlyReportPDF(currentMonth, deals, myOrders)
                toast.success('Monthly PDF Report downloaded!', { id: toastId })
              } catch (e: any) {
                toast.error('Failed to generate PDF report: ' + (e.message || e), { id: toastId })
              }
            }}
            className="h-9 text-xs gap-1.5 font-semibold border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 cursor-pointer shadow-sm"
          >
            <FileDown className="h-4 w-4 text-indigo-600" />
            Monthly PDF Report
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 text-xs gap-1.5 font-semibold">
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="icon" onClick={load} title="Refresh" className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Summary Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-border bg-card premium-card hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-tight truncate">Total Revenue Booked</p>
              <h3 className="text-xl font-extrabold font-mono text-foreground mt-2">{formatCurrencyCompact(totalRevenueSum, 'INR')}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm border border-border/40 bg-background/85">
              <Coins className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card premium-card hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-tight truncate">Revenue Accepted (Closed)</p>
              <h3 className="text-xl font-extrabold font-mono text-emerald-600 mt-2">
                {formatCurrencyCompact(completedOrdersList.reduce((s, o) => s + orderRevenue(o), 0), 'INR')}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm border border-border/40 bg-background/85">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card premium-card hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between gap-3">
            {isSalesRep ? (
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-tight truncate">Incentive Payable</p>
                <h3 className="text-xl font-extrabold font-mono text-amber-600 mt-2">
                  {formatCurrencyCompact(completedOrdersList.reduce((s, o) => s + orderMargin(o), 0) * incentivePct, 'INR')}
                </h3>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-tight truncate">Total Gross Margin</p>
                <h3 className="text-xl font-extrabold font-mono text-emerald-600 mt-2">
                  {formatCurrencyCompact(totalMarginSum, 'INR')}
                </h3>
              </div>
            )}
            <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-sm border border-border/40 bg-background/85">
              <Coins className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card premium-card hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-tight truncate">Pending Reviews/Execution</p>
              <h3 className="text-xl font-extrabold font-mono text-sky-600 mt-2">
                {formatCurrencyCompact(pendingOrdersList.reduce((s, o) => s + orderRevenue(o), 0), 'INR')}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 shadow-sm border border-border/40 bg-background/85">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs Selector ── */}
      <div className="flex flex-wrap border-b border-border/60 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl p-1 gap-1 border">
        {tabList.map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'bg-background shadow-sm border text-primary border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Report Content Area ── */}
      <Card className="shadow-sm border-border bg-card overflow-hidden">
        <CardContent className="p-0">
          {/* Tab 1: Revenue Report */}
          {activeTab === 'revenue' && isTabVisible('revenue') && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3">Order Number</th>
                    <th className="px-4 py-3">Order Date</th>
                    <th className="px-4 py-3">Customer Account</th>
                    <th className="px-4 py-3">Sales Person</th>
                    <th className="px-4 py-3">PO Number</th>
                    <th className="px-4 py-3 text-right">Revenue (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {myOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <EmptyState
                          icon={Coins}
                          title="No orders found"
                          description="No revenue orders matched the active filters."
                        />
                      </td>
                    </tr>
                  ) : (
                    myOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-primary">{o.order_number}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {o.created_at ? formatDate(o.created_at) : '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">{o.customer_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{o.sales_rep_name}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{getPoDisplayNumber(o)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                          {formatCurrency(orderRevenue(o), 'INR')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {myOrders.length > 0 && (
                  <tfoot className="border-t-2 border-border/60 bg-muted/20">
                    <tr className="font-bold text-foreground">
                      <td colSpan={5} className="px-4 py-3 text-right text-[10px] uppercase tracking-wider">
                        Total Revenue
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-lg text-primary">
                        {formatCurrency(totalRevenueSum, 'INR')}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Tab: Business Report */}
          {activeTab === 'business' && isTabVisible('business') && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3">Business Account</th>
                    <th className="px-4 py-3 text-center">Total Orders</th>
                    <th className="px-4 py-3 text-right">Total Revenue (INR)</th>
                    {canSeeAll && <th className="px-4 py-3 text-right">Margin Achieved</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {businessReport.length === 0 ? (
                    <tr>
                      <td colSpan={canSeeAll ? 4 : 3} className="p-0">
                        <EmptyState
                          icon={Building}
                          title="No business account data matched the filters"
                          description="Try modifying your search query or sales rep filter."
                        />
                      </td>
                    </tr>
                  ) : (
                    businessReport.map((b, idx) => (
                      <tr key={idx} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {b.customer}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">{b.orderCount}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                          {formatCurrency(b.revenue, 'INR')}
                        </td>
                        {canSeeAll && (
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                            {formatCurrency(b.margin, 'INR')}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {businessReport.length > 0 && (
                  <tfoot className="border-t-2 border-border/60 bg-muted/20">
                    <tr className="font-bold text-foreground">
                      <td className="px-4 py-3 text-[10px] uppercase tracking-wider">Total</td>
                      <td className="px-4 py-3 text-center font-mono">
                        {businessReport.reduce((s, b) => s + b.orderCount, 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-primary">
                        {formatCurrency(businessReport.reduce((s, b) => s + b.revenue, 0), 'INR')}
                      </td>
                      {canSeeAll && (
                        <td className="px-4 py-3 text-right font-mono text-emerald-700">
                          {formatCurrency(businessReport.reduce((s, b) => s + b.margin, 0), 'INR')}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Tab 2: Margin Report */}
          {activeTab === 'margin' && isTabVisible('margin') && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3">Order Number</th>
                    <th className="px-4 py-3">Customer Account</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Transfer Cost</th>
                    <th className="px-4 py-3 text-right">Gross Margin</th>
                    <th className="px-4 py-3 text-center">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {myOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <EmptyState
                          icon={TrendingUp}
                          title="No margin data matched the filters"
                          description="Try modifying your search query or sales rep filter."
                        />
                      </td>
                    </tr>
                  ) : (
                    myOrders.map((o) => {
                      const rev = orderRevenue(o)
                      const cost = orderCost(o)
                      const margin = rev - cost
                      const marginPct = rev > 0 ? (margin / rev) * 100 : 0
                      return (
                        <tr key={o.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-primary">{o.order_number}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{o.customer_name}</td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                            {formatCurrency(rev, 'INR')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                            {formatCurrency(cost, 'INR')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                            {formatCurrency(margin, 'INR')}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-emerald-600">
                            {(marginPct || 0).toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                {myOrders.length > 0 && (
                  <tfoot className="border-t-2 border-border/60 bg-muted/20">
                    <tr className="font-bold text-foreground">
                      <td colSpan={2} className="px-4 py-3 text-right text-[10px] uppercase tracking-wider">
                        Total / Combined Avg
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalRevenueSum, 'INR')}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalCostSum, 'INR')}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">
                        {formatCurrency(totalMarginSum, 'INR')}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-lg text-emerald-600">
                        {(averageMarginPct || 0).toFixed(1)}%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Tab 3: Incentive Report */}
          {activeTab === 'incentive' && isTabVisible('incentive') && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3">Sales Person</th>
                    <th className="px-4 py-3 text-right">Revenue Target</th>
                    <th className="px-4 py-3 text-right">Revenue Booked</th>
                    <th className="px-4 py-3 text-right">Margin Target</th>
                    <th className="px-4 py-3 text-right">Margin Achieved</th>
                    <th className="px-4 py-3 text-right">Incentive Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {myTargets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <EmptyState
                          icon={Coins}
                          title="No targets configured"
                          description="Incentives require salesperson targets to be set up by an admin."
                        />
                      </td>
                    </tr>
                  ) : (
                    myTargets.map((t) => {
                      const repOrders = orders.filter(
                        (o) => (o.sales_rep_id === t.salesperson_id || o.sales_rep_name === t.salesperson_name) && isOrderCompleted(o)
                      )
                      const rev = repOrders.reduce((s, o) => s + orderRevenue(o), 0)
                      const margin = repOrders.reduce((s, o) => s + orderMargin(o), 0)
                      const marginTarget = t.topline_target * bottomLinePct
                      const incentive = margin * incentivePct
                      return (
                        <tr key={t.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-semibold text-foreground">{t.salesperson_name}</td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                            {formatCurrency(t.topline_target, 'INR')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                            {formatCurrency(rev, 'INR')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                            {formatCurrency(marginTarget, 'INR')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                            {formatCurrency(margin, 'INR')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">
                            {formatCurrency(incentive, 'INR')}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 4: Sales Performance Report */}
          {activeTab === 'sales' && isTabVisible('sales') && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3">Sales Person</th>
                    <th className="px-4 py-3 text-right">Target FY Revenue</th>
                    <th className="px-4 py-3 text-center">Total Orders</th>
                    <th className="px-4 py-3 text-right">Revenue Achieved</th>
                    <th className="px-4 py-3 text-right">Margin Achieved</th>
                    <th className="px-4 py-3 text-center">Rev. Achievement %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {myTargets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <EmptyState
                          icon={Briefcase}
                          title="No targets configured"
                          description="Sales reporting requires targets to be set up by an admin."
                        />
                      </td>
                    </tr>
                  ) : (
                    myTargets.map((t) => {
                      const repOrders = orders.filter(
                        (o) => (o.sales_rep_id === t.salesperson_id || o.sales_rep_name === t.salesperson_name) && isOrderCompleted(o)
                      )
                      const rev = repOrders.reduce((s, o) => s + orderRevenue(o), 0)
                      const margin = repOrders.reduce((s, o) => s + orderMargin(o), 0)
                      const revPct = t.topline_target > 0 ? (rev / t.topline_target) * 100 : 0
                      return (
                        <tr key={t.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-semibold text-foreground">{t.salesperson_name}</td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                            {formatCurrency(t.topline_target, 'INR')}
                          </td>
                          <td className="px-4 py-3 text-center font-mono">{repOrders.length}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                            {formatCurrency(rev, 'INR')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                            {formatCurrency(margin, 'INR')}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-primary">
                            {(revPct || 0).toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 5: Pending Orders Report */}
          {activeTab === 'pending' && isTabVisible('pending') && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3">Order Number</th>
                    <th className="px-4 py-3">Customer Account</th>
                    <th className="px-4 py-3">PO Number</th>
                    <th className="px-4 py-3">Expected Delivery Date</th>
                    <th className="px-4 py-3 text-center">Completed Gates</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {pendingOrdersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <EmptyState
                          icon={Clock}
                          title="No pending orders found"
                          description="All registered orders are either completed or cancelled."
                        />
                      </td>
                    </tr>
                  ) : (
                    pendingOrdersList.map((o) => {
                      const completedGatesCount = o.checklist ? Object.values(o.checklist).filter(Boolean).length : 0
                      return (
                        <tr key={o.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-primary">{o.order_number}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{o.customer_name}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{getPoDisplayNumber(o)}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            {o.expected_delivery_date ? formatDate(o.expected_delivery_date) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-sky-600">
                            {completedGatesCount} / 10 Gates
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700">
                              Execution
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 6: Completed Orders Report */}
          {activeTab === 'completed' && isTabVisible('completed') && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3">Order Number</th>
                    <th className="px-4 py-3">Customer Account</th>
                    <th className="px-4 py-3">PO Number</th>
                    <th className="px-4 py-3">Delivery Date</th>
                    <th className="px-4 py-3 text-center">Execution Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {completedOrdersList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <EmptyState
                          icon={CheckCircle2}
                          title="No completed orders found"
                          description="Registered orders have not yet completed execution gates."
                        />
                      </td>
                    </tr>
                  ) : (
                    completedOrdersList.map((o) => (
                      <tr key={o.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-primary">{o.order_number}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{o.customer_name}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{getPoDisplayNumber(o)}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {o.expected_delivery_date ? formatDate(o.expected_delivery_date) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                            Closed / Delivered
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
