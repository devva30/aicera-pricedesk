import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { StatCard } from '@/components/shared/stat-card'
import { DashboardCharts } from '@/components/dashboard/charts'
import { useAuthStore } from '@/stores/auth-store'
import { setDeals, setLoading } from '@/store/deals-slice'
import { fetchDeals } from '@/services/deals-service'
import { formatCurrency } from '@/lib/utils'
import type { RootState } from '@/store'
import { BarChart3, CheckCircle2, IndianRupee, Percent } from 'lucide-react'

export function AdminAnalyticsPage() {
  const user = useAuthStore((s) => s.user)
  const dispatch = useDispatch()
  const { deals, isLoading } = useSelector((s: RootState) => s.deals)

  const actualDeals = useMemo(() => {
    return deals.filter((d) => !d.is_quote_only)
  }, [deals])

  useEffect(() => {
    if (!user?.role || !user?.id) return
    const load = async () => {
      dispatch(setLoading(true))
      try {
        const data = await fetchDeals(user.role, user.id)
        dispatch(setDeals(data || []))
      } catch (err) {
        console.error(err)
      } finally {
        dispatch(setLoading(false))
      }
    }
    load()
  }, [user, dispatch])

  const approved = useMemo(() => actualDeals.filter((d) => d.status === 'approved'), [actualDeals])
  const totalRevenue = useMemo(() => actualDeals.reduce((s, d) => s + d.total_revenue, 0), [actualDeals])
  const approvedRevenue = useMemo(() => approved.reduce((s, d) => s + d.total_revenue, 0), [approved])
  const avgMargin = useMemo(() =>
    actualDeals.length > 0
      ? actualDeals.reduce((s, d) => s + d.net_margin_pct, 0) / actualDeals.length
      : 0, [actualDeals])
  const approvalRate = useMemo(() =>
    actualDeals.length > 0 ? (approved.length / actualDeals.length) * 100 : 0, [actualDeals, approved])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Organization-wide pricing performance and pipeline metrics
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Pipeline"
          value={formatCurrency(totalRevenue)}
          icon={IndianRupee}
          loading={isLoading}
        />
        <StatCard
          title="Approved Revenue"
          value={formatCurrency(approvedRevenue)}
          change={15}
          icon={BarChart3}
          loading={isLoading}
        />
        <StatCard
          title="Approval Rate"
          value={`${approvalRate.toFixed(0)}%`}
          icon={CheckCircle2}
          loading={isLoading}
        />
        <StatCard
          title="Avg Net Margin"
          value={`${avgMargin.toFixed(1)}%`}
          icon={Percent}
          loading={isLoading}
        />
      </div>

      <DashboardCharts deals={actualDeals} />
    </div>
  )
}
