import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  ScrollText,
  Shield,
  TrendingUp,
  Users,
  Wrench,
  Wallet,
  X,
  Package,
  Quote,
  Target,
  Layers,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import type { UserRole } from '@/types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { InstallGuide } from '@/components/pwa/install-guide'
import { usePwaInstall } from '@/hooks/use-pwa-install'

interface SubNavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
  subItems?: SubNavItem[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['sales_rep', 'finance', 'technical', 'sales_head', 'admin', 'ops'] },
  {
    label: 'My Quotes',
    href: '/quotes',
    icon: Quote,
    roles: ['sales_rep', 'sales_head', 'admin'],
    subItems: [
      { label: 'Create Quote', href: '/quotes/new', icon: Plus, roles: ['sales_rep', 'admin'] },
    ],
  },
  { label: 'My Deals', href: '/deals', icon: FileText, roles: ['sales_rep'] },
  { label: 'New Request', href: '/deals/new', icon: Plus, roles: ['sales_rep'] },
  { label: 'Tech Queue', href: '/queue/technical', icon: Wrench, roles: ['technical', 'admin'] },
  { label: 'Finance Queue', href: '/queue/finance', icon: Wallet, roles: ['finance', 'admin'] },
  { label: 'Review Center', href: '/queue/sales-head', icon: ClipboardCheck, roles: ['sales_head', 'admin'] },
  { label: 'Assigned Deals', href: '/deals', icon: FileText, roles: ['ops'] },
  { label: 'All Deals', href: '/deals', icon: FileText, roles: ['finance', 'technical', 'sales_head', 'admin'] },
  {
    label: 'My Orders',
    href: '/orders',
    icon: Package,
    roles: ['sales_rep', 'finance', 'sales_head', 'ops', 'admin'],
    subItems: [
      { label: 'Delivery Challans', href: '/orders/challans', icon: ScrollText, roles: ['sales_rep', 'finance', 'sales_head', 'ops', 'admin'] },
    ],
  },
  { label: 'My Incentive', href: '/incentive', icon: TrendingUp, roles: ['sales_rep', 'sales_head', 'admin', 'ops'] },
  { label: 'Reports', href: '/reports', icon: Layers, roles: ['sales_rep', 'sales_head', 'admin', 'ops'] },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, roles: ['admin'] },
  { label: 'Targets', href: '/admin/targets', icon: Target, roles: ['admin', 'sales_head'] },
  { label: 'Users', href: '/admin/users', icon: Users, roles: ['admin'] },
  { label: 'Audit Log', href: '/admin/audit', icon: ScrollText, roles: ['admin'] },
  { label: 'Settings', href: '/admin/settings', icon: Settings, roles: ['admin'] },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  isCollapsed?: boolean
}

export function Sidebar({ isOpen, onClose, isCollapsed = false }: SidebarProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const role = user?.role ?? 'sales_rep'
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role))
  const [showInstallGuide, setShowInstallGuide] = useState(false)
  const { isInstalled } = usePwaInstall()

  const handleLogout = async () => {
    await logout()
    toast.success('Signed out successfully')
    navigate('/login')
  }

  // Label visibility (visible if drawer open on mobile OR not collapsed on desktop)
  const showLabel = isOpen || !isCollapsed

  // Whether the parent section is "expanded" (user is anywhere under /orders or /quotes)
  const isOrdersSection = location.pathname.startsWith('/orders')
  const isQuotesSection = location.pathname.startsWith('/quotes')

  const isItemActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard'
    if (href === '/deals') return location.pathname.startsWith('/deals') && location.pathname !== '/deals/new'
    if (href === '/orders') return location.pathname === '/orders' || (location.pathname.startsWith('/orders/') && location.pathname !== '/orders/new' && location.pathname !== '/orders/challans')
    if (href === '/quotes') return location.pathname === '/quotes'
    return location.pathname === href
  }

  const ROLE_DISPLAY: Record<UserRole, string> = {
    sales_rep: 'Sales Representative',
    finance: 'Finance Team',
    technical: 'Technical Team',
    sales_head: 'Sales Head',
    admin: 'Admin',
    ops: 'Ops Executive',
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <aside className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border/50 bg-sidebar shadow-xl transition-all duration-300 ease-in-out print:hidden',
        isCollapsed ? 'lg:w-[72px]' : 'lg:w-64',
        isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
      )}>

        {/* ── Brand Header ── */}
        <div className="flex h-16 items-center justify-between border-b border-border/50 px-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* PriceDesk Logo */}
            <img
              src="https://framerusercontent.com/images/AlNvsxkJzF8SFWwwytH2xsnL8uM.png"
              alt="PriceDesk Logo"
              className="h-7 w-7 rounded-md object-contain shrink-0"
            />
            <div className={cn("min-w-0", showLabel ? "block" : "hidden")}>
              <h1 className="font-display text-lg font-extrabold tracking-tight aicera-gradient-text truncate">
                PriceDesk
              </h1>
            </div>
          </div>

          {/* Close button (mobile only) */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Navigation ── */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          <p className={cn("text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2", showLabel ? "block" : "hidden")}>
            Navigation
          </p>
          <nav className="space-y-0.5">
            {items.map((item) => {
              const active = isItemActive(item.href)
              const hasSubItems = item.subItems && item.subItems.length > 0
              const showSubItems = hasSubItems && (isOrdersSection || isQuotesSection)
              const displayLabel = item.href === '/incentive'
                ? (role === 'sales_rep' ? 'My Incentives' : 'Sales Incentives')
                : item.label

              return (
                <React.Fragment key={item.href + displayLabel}>
                  <NavLink
                    to={item.href}
                    onClick={onClose}
                    title={isCollapsed ? displayLabel : undefined}
                    className={cn(
                      'flex items-center gap-3 px-2.5 py-2 text-sm font-medium transition-all rounded-lg border-l-2 group',
                      active
                        ? 'bg-primary/10 text-primary font-semibold border-primary pl-2 shadow-[inset_4px_0_0_0_rgba(124,58,237,0.05)]'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border-transparent'
                    )}
                  >
                    <item.icon className={cn('h-4 w-4 shrink-0 transition-colors', active && 'text-primary')} />
                    <span className={cn("truncate", showLabel ? "block" : "hidden")}>{displayLabel}</span>
                    {active && !hasSubItems && (
                      <div className={cn("ml-auto w-1 h-3.5 rounded-full bg-primary", showLabel ? "block" : "hidden")} />
                    )}
                  </NavLink>

                  {/* Collapsible sub-items — visible only when parent section is active */}
                  {showSubItems && (
                    <div className={cn("ml-5 pl-3.5 border-l-2 border-border/50 space-y-0.5 mt-0.5 mb-1", showLabel ? "block" : "hidden")}>
                      {item.subItems!.filter(sub => sub.roles.includes(role)).map(sub => {
                        const subActive = location.pathname === sub.href
                        return (
                          <NavLink
                            key={sub.href}
                            to={sub.href}
                            onClick={onClose}
                            title={isCollapsed ? sub.label : undefined}
                            className={cn(
                              'flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium transition-all rounded-md',
                              subActive
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                            )}
                          >
                            <sub.icon className={cn('h-3.5 w-3.5 shrink-0', subActive && 'text-primary')} />
                            <span className={cn("truncate", showLabel ? "block" : "hidden")}>{sub.label}</span>
                            {subActive && (
                              <div className={cn("ml-auto w-1 h-3 rounded-full bg-primary", showLabel ? "block" : "hidden")} />
                            )}
                          </NavLink>
                        )
                      })}
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </nav>
        </div>

        {/* ── User Profile + Logout ── */}
        <div className="border-t border-border/50 p-3 shrink-0">
          {/* User info */}
          <div className="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-lg bg-muted/20 border border-border/40 min-w-0">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 via-pink-500 to-cyan-400 flex items-center justify-center shrink-0 text-white font-bold text-[11px]">
              {user?.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className={cn("min-w-0 flex-1", showLabel ? "block" : "hidden")}>
              <p className="text-xs font-semibold text-foreground truncate">{user?.full_name}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {user ? ROLE_DISPLAY[user.role] : ''}
              </p>
            </div>
          </div>

          {/* Install App button */}
          <button
            onClick={() => setShowInstallGuide(true)}
            title={isCollapsed ? 'Install App' : undefined}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors cursor-pointer mb-1 group"
          >
            <Download className="h-4 w-4 shrink-0 text-violet-500" />
            <span className={cn("truncate", showLabel ? "block" : "hidden")}>
              {isInstalled ? 'App Installed ✓' : 'Install App'}
            </span>
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Sign Out' : undefined}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer group"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn("truncate", showLabel ? "block" : "hidden")}>Sign Out</span>
          </button>

          {/* Enterprise badge */}
          <div className={cn("items-center gap-1.5 px-2 mt-2", showLabel ? "flex" : "hidden")}>
            <Shield className="h-3 w-3 text-primary" />
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Enterprise Mode</span>
          </div>
        </div>
      </aside>

      {/* Install Guide Modal */}
      <InstallGuide open={showInstallGuide} onClose={() => setShowInstallGuide(false)} />
    </>
  )
}
