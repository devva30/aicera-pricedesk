import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Inbox } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { DealsTable } from '@/components/deals/deals-table'
import { EmptyState } from '@/components/shared/empty-state'
import { getQueueDeals } from '@/components/dashboard/charts'
import { useAuthStore } from '@/stores/auth-store'
import { setDeals, setLoading } from '@/store/deals-slice'
import { fetchDeals } from '@/services/deals-service'
import type { RootState } from '@/store'

const TITLES: Record<string, { title: string; subtitle: string }> = {
  finance: {
    title: 'Finance Approval Queue',
    subtitle: 'Review pricing deals for margin compliance and financial viability',
  },
  technical: {
    title: 'Technical Review Queue',
    subtitle: 'Validate solution scope and technical feasibility',
  },
  'sales-head': {
    title: 'Sales Head Review Center',
    subtitle: 'Final approval authority for strategic pricing decisions',
  },
}

export function QueuePage() {
  const { pathname } = useLocation()
  const key = pathname.includes('technical')
    ? 'technical'
    : pathname.includes('sales-head')
      ? 'sales-head'
      : 'finance'
  const user = useAuthStore((s) => s.user)
  const dispatch = useDispatch()
  const { deals, isLoading } = useSelector((s: RootState) => s.deals)
  const meta = TITLES[key] ?? TITLES.finance

  const queueKey =
    key === 'sales-head' ? 'sales_head' : (key as 'finance' | 'technical')

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

  const queueDeals = getQueueDeals(
    deals.filter((d) => !d.is_quote_only),
    queueKey === 'sales_head' ? 'sales_head' : queueKey
  )

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold font-display">{meta.title}</h1>
        <p className="text-muted-foreground mt-1">{meta.subtitle}</p>
      </motion.div>

      {isLoading ? (
        <div className="glass-card h-64 animate-pulse rounded-xl" />
      ) : queueDeals.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Queue is empty"
          description="No deals are currently awaiting your review. Check back later."
        />
      ) : (
        <DealsTable deals={queueDeals} showCreator hideStatusFilter />
      )}
    </div>
  )
}
