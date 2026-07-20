import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Layers, RefreshCw } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import { DealsTable } from '@/components/deals/deals-table'
import { useAuthStore } from '@/stores/auth-store'
import { setDeals, setLoading } from '@/store/deals-slice'
import { fetchDeals } from '@/services/deals-service'
import type { RootState } from '@/store'
import { formatCurrency } from '@/lib/utils'

export function DealsListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const dispatch = useDispatch()
  const { deals, isLoading } = useSelector((s: RootState) => s.deals)

  const actualDeals = useMemo(() => {
    return deals.filter((d) => !d.is_quote_only)
  }, [deals])

  const loadData = async () => {
    if (!user?.role || !user?.id) return
    dispatch(setLoading(true))
    try {
      const data = await fetchDeals(user.role, user.id)
      dispatch(setDeals(data || []))
    } catch (e) {
      console.error(e)
    } finally {
      dispatch(setLoading(false))
    }
  }

  useEffect(() => {
    if (user?.role && user?.id) {
      loadData()
    }
  }, [user, dispatch])

  // Summary Metrics
  const totalRevenue = useMemo(() => {
    return actualDeals.reduce((sum, d) => sum + d.total_revenue, 0)
  }, [actualDeals])

  return (
    <div className="space-y-6">
      {/* Salesforce List View Header */}
      <div className="bg-card border border-border rounded-lg shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Object List View</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-xl font-bold font-display text-foreground">Deals</h1>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button variant="outline" size="icon" onClick={loadData} title="Refresh list" className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {user.role === 'sales_rep' && (
            <Button onClick={() => navigate('/deals/new')} size="sm" className="h-9 text-xs font-semibold px-4">
              <Plus className="h-4 w-4 mr-1.5" />
              New Deal
            </Button>
          )}
        </div>
      </div>

      {/* List Summary KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-card border border-border rounded-lg shadow-sm p-4 text-xs">
        <div>
          <p className="text-muted-foreground font-semibold">List Item Count</p>
          <p className="font-bold text-foreground mt-1 text-sm">{actualDeals.length} record(s)</p>
        </div>
        <div>
          <p className="text-muted-foreground font-semibold">Total Revenue</p>
          <p className="font-bold text-foreground mt-1 text-sm">{formatCurrency(totalRevenue)}</p>
        </div>
        <div>
          <p className="text-muted-foreground font-semibold">Data Refresh</p>
          <p className="font-semibold text-muted-foreground mt-1 text-sm">Real-time DB connection</p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-card border border-border rounded-lg h-96 animate-pulse shadow-sm" />
      ) : (
        <div className="bg-card border border-border rounded-lg shadow-sm p-4">
          <DealsTable deals={actualDeals} showCreator={user.role !== 'sales_rep'} />
        </div>
      )}
    </div>
  )
}
