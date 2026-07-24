import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import {
  FileText,
  LayoutDashboard,
  Plus,
  Search,
  Package,
  Quote,
  Layers,
  TrendingUp,
  Target,
  Users,
  ScrollText,
  Settings,
  BarChart3,
  Wrench,
  Wallet,
  ClipboardCheck,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/auth-store'
import { fetchDeals } from '@/services/deals-service'
import { fetchOrders } from '@/services/orders-service'
import type { Deal, Order } from '@/types'

export const COMMAND_OPEN_EVENT = 'pricedesk:command-open'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [deals, setDeals] = useState<Deal[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const openHandler = () => setOpen(true)
    document.addEventListener('keydown', down)
    window.addEventListener(COMMAND_OPEN_EVENT, openHandler)
    return () => {
      document.removeEventListener('keydown', down)
      window.removeEventListener(COMMAND_OPEN_EVENT, openHandler)
    }
  }, [])

  useEffect(() => {
    if (!open || !user?.role || !user?.id) return
    const loadData = async () => {
      setLoading(true)
      try {
        const [dList, oList] = await Promise.all([
          fetchDeals(user.role, user.id),
          fetchOrders(user.role, user.id),
        ])
        setDeals(dList)
        setOrders(oList)
      } catch (e) {
        console.error('Failed to load global search data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [open, user])

  const run = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  const role = user?.role || 'sales_rep'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 max-w-xl border border-border shadow-2xl">
        <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
          <div className="flex items-center border-b border-border px-3 bg-muted/20">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder="Search deals, orders, pages, customers..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-xs outline-none placeholder:text-muted-foreground font-medium"
            />
            {loading && <span className="text-[10px] text-muted-foreground font-semibold shrink-0 animate-pulse">Loading...</span>}
          </div>

          <Command.List className="max-h-96 overflow-y-auto p-2 space-y-1">
            <Command.Empty className="py-6 text-center text-xs text-muted-foreground">
              No matching deals, orders, or pages found.
            </Command.Empty>

            {/* Quick Navigation Group */}
            <Command.Group heading="Navigation Pages">
              <Command.Item
                onSelect={() => run('/dashboard')}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
              >
                <LayoutDashboard className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>Dashboard</span>
              </Command.Item>

              {(role === 'sales_rep' || role === 'sales_head' || role === 'admin') && (
                <Command.Item
                  onSelect={() => run('/quotes')}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                >
                  <Quote className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>My Quotes</span>
                </Command.Item>
              )}

              {(role === 'sales_rep' || role === 'admin') && (
                <Command.Item
                  onSelect={() => run('/quotes/new')}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                >
                  <Plus className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Create New Quote</span>
                </Command.Item>
              )}

              <Command.Item
                onSelect={() => run('/deals')}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
              >
                <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                <span>{role === 'ops' ? 'Assigned Deals' : role === 'sales_rep' ? 'My Deals' : 'All Deals'}</span>
              </Command.Item>

              {role === 'sales_rep' && (
                <Command.Item
                  onSelect={() => run('/deals/new')}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                >
                  <Plus className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>New Deal Request</span>
                </Command.Item>
              )}

              {['sales_rep', 'finance', 'sales_head', 'ops', 'admin'].includes(role) && (
                <Command.Item
                  onSelect={() => run('/orders')}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                >
                  <Package className="h-4 w-4 text-purple-500 shrink-0" />
                  <span>My Orders</span>
                </Command.Item>
              )}

              {['sales_rep', 'finance', 'sales_head', 'ops', 'admin'].includes(role) && (
                <Command.Item
                  onSelect={() => run('/orders/challans')}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                >
                  <ScrollText className="h-4 w-4 text-sky-500 shrink-0" />
                  <span>Delivery Challans</span>
                </Command.Item>
              )}

              {['technical', 'admin'].includes(role) && (
                <Command.Item
                  onSelect={() => run('/queue/technical')}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                >
                  <Wrench className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>Tech Queue</span>
                </Command.Item>
              )}

              {['finance', 'admin'].includes(role) && (
                <Command.Item
                  onSelect={() => run('/queue/finance')}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                >
                  <Wallet className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Finance Queue</span>
                </Command.Item>
              )}

              {['sales_head', 'admin'].includes(role) && (
                <Command.Item
                  onSelect={() => run('/queue/sales-head')}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                >
                  <ClipboardCheck className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>Review Center</span>
                </Command.Item>
              )}

              {['sales_rep', 'sales_head', 'admin', 'ops'].includes(role) && (
                <Command.Item
                  onSelect={() => run('/incentive')}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                >
                  <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>My Incentive</span>
                </Command.Item>
              )}

              {['sales_rep', 'sales_head', 'admin', 'ops'].includes(role) && (
                <Command.Item
                  onSelect={() => run('/reports')}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                >
                  <Layers className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>Reports</span>
                </Command.Item>
              )}

              {role === 'admin' && (
                <Command.Item
                  onSelect={() => run('/admin/analytics')}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                >
                  <BarChart3 className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>Analytics</span>
                </Command.Item>
              )}

              {['admin', 'sales_head'].includes(role) && (
                <Command.Item
                  onSelect={() => run('/admin/targets')}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                >
                  <Target className="h-4 w-4 text-teal-500 shrink-0" />
                  <span>Sales Targets</span>
                </Command.Item>
              )}

              {role === 'admin' && (
                <Command.Item
                  onSelect={() => run('/admin/users')}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                >
                  <Users className="h-4 w-4 text-cyan-500 shrink-0" />
                  <span>User Management</span>
                </Command.Item>
              )}

              {role === 'admin' && (
                <Command.Item
                  onSelect={() => run('/admin/settings')}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                >
                  <Settings className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Settings</span>
                </Command.Item>
              )}
            </Command.Group>

            {/* Deals Search Group */}
            {deals.length > 0 && (
              <Command.Group heading="Deals">
                {deals.slice(0, 15).map((deal) => (
                  <Command.Item
                    key={deal.id}
                    value={`${deal.deal_number} ${deal.title} ${deal.customer_name} ${deal.oem || ''} ${deal.quote_number || ''}`}
                    onSelect={() => run(`/deals/${deal.id}`)}
                    className="flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-xs cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="font-bold truncate">{deal.deal_number}</span>
                      <span className="text-muted-foreground truncate">— {deal.title}</span>
                      <span className="text-[10px] text-slate-400 truncate">({deal.customer_name})</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 uppercase">
                      {deal.status.replace(/_/g, ' ')}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Orders Search Group */}
            {orders.length > 0 && (
              <Command.Group heading="Orders">
                {orders.slice(0, 15).map((order) => (
                  <Command.Item
                    key={order.id}
                    value={`${order.order_number} ${order.title} ${order.customer_name} ${order.supplier_name || ''} ${order.ops_owner || ''}`}
                    onSelect={() => run(`/orders/${order.id}`)}
                    className="flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-xs cursor-pointer hover:bg-accent aria-selected:bg-accent text-foreground"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="h-4 w-4 text-purple-500 shrink-0" />
                      <span className="font-bold truncate">{order.order_number}</span>
                      <span className="text-muted-foreground truncate">— {order.title}</span>
                      <span className="text-[10px] text-slate-400 truncate">({order.customer_name})</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                      v{order.version_number || 1}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
