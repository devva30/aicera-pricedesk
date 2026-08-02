import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, BellOff, Info, LogOut, Menu, Moon, Sun, User, Search, CheckCircle2, ExternalLink, Check, Sparkles, Shield, RefreshCw, Lock } from 'lucide-react'
import { requestBrowserNotificationPermission, showBrowserNotification } from '@/lib/audio-notifications'
import { approveDeal } from '@/services/deals-service'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/auth-store'
import { useThemeStore } from '@/stores/theme-store'
import { useNotificationStore } from '@/stores/notification-store'
import { ROLE_LABELS } from '@/types'
import { formatRelative } from '@/lib/utils'

interface HeaderProps {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const navigate  = useNavigate()
  const user      = useAuthStore((s) => s.user)
  const logout    = useAuthStore((s) => s.logout)
  const isDemo    = useAuthStore((s) => s.isDemo)
  const { theme, setTheme, applyTheme } = useThemeStore()
  const { notifications, fetchNotifications, subscribeToLiveNotifications, markAsRead, markAllRead, unreadCount } = useNotificationStore()

  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  })
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('pricedesk_push_disabled') === 'true' : false
  })
  const [showHelpModal, setShowHelpModal] = useState(false)

  useEffect(() => {
    applyTheme()
    if (!user) return

    if (isDemo) {
      // Demo mode: initial load + 2 s poll for event-bus updates
      fetchNotifications(user.id)
      const pollId = setInterval(() => fetchNotifications(user.id), 2000)
      return () => clearInterval(pollId)
    } else {
      // Live mode: Firestore onSnapshot real-time listener — instant updates
      const unsubscribe = subscribeToLiveNotifications(user.id)
      return () => { if (unsubscribe) unsubscribe() }
    }
  }, [user, isDemo, applyTheme, fetchNotifications, subscribeToLiveNotifications])

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleTogglePushAlerts = async () => {
    if (pushPermission !== 'granted') {
      const permission = await requestBrowserNotificationPermission()
      setPushPermission(permission)
      if (permission === 'granted') {
        localStorage.removeItem('pricedesk_push_disabled')
        setIsMuted(false)
        showBrowserNotification('PriceDesk Alerts Enabled!', 'Desktop notifications are active for deal approvals & order assignments.')
        toast.success('Desktop Push Alerts enabled!')
      } else {
        // Open the helper modal so user knows exactly how to enable it in browser settings
        setShowHelpModal(true)
        toast.info('Please enable notifications in your browser settings.')
      }
    } else {
      if (isMuted) {
        localStorage.removeItem('pricedesk_push_disabled')
        setIsMuted(false)
        toast.success('Push alerts enabled!')
      } else {
        localStorage.setItem('pricedesk_push_disabled', 'true')
        setIsMuted(true)
        toast.info('Push alerts muted in PriceDesk.')
      }
    }
  }

  const checkPermissionState = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const current = Notification.permission
      setPushPermission(current)
      if (current === 'granted') {
        setShowHelpModal(false)
        toast.success('Browser notification permission granted!')
      } else {
        toast.info(`Permission status is currently: ${current}. Please follow the steps below.`)
      }
    }
  }

  const handleQuickApprove = async (e: React.MouseEvent, notif: any) => {
    e.stopPropagation()
    if (!user || !notif.deal_id) return
    const toastId = toast.loading('Approving deal from notification...')
    try {
      await approveDeal(notif.deal_id, user.id, 'pending_sales_head', false, 'Approved via quick notification action', 'Chetan')
      markAsRead(notif.id)
      // Refresh bell so approved-deal notification for Sales Rep is persisted and current user's list is updated
      await fetchNotifications(user.id)
      toast.success('Deal approved successfully & Ops Executive assigned!', { id: toastId })
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve deal', { id: toastId })
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] md:h-16 md:pt-0 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-3 md:px-6 gap-2">

        {/* Left: Hamburger menu toggle button (3-line options button) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="h-9 w-9 shrink-0 hover:bg-muted/80 text-foreground"
            title="Toggle Navigation Sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* PriceDesk logo - mobile only since sidebar brand is hidden on mobile */}
          <div className="flex items-center gap-1.5 lg:hidden min-w-0">
            <img
              src="https://framerusercontent.com/images/AlNvsxkJzF8SFWwwytH2xsnL8uM.png"
              alt="PriceDesk Logo"
              className="h-6 w-6 rounded-md object-contain shrink-0"
            />
            <h1 className="text-sm font-bold aicera-gradient-text truncate">PriceDesk</h1>
          </div>
        </div>

        {/* Search Input Trigger (Zoho style Global Search) */}
        <div className="flex-1 max-w-xs md:max-w-md mx-1 sm:mx-4">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('pricedesk:command-open'))}
            className="flex items-center w-full gap-2 px-2.5 py-1.5 text-xs text-muted-foreground border border-input rounded-lg bg-muted/40 hover:bg-muted/70 hover:text-foreground transition-all duration-200 outline-none text-left cursor-pointer"
          >
            <Search className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="truncate hidden sm:inline">Search deals, orders, pages...</span>
            <span className="truncate sm:hidden">Search...</span>
            <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 ml-auto shadow-sm">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 md:gap-2">

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 hover:bg-muted/80 active:scale-95 transition-all"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark'
              ? <Sun className="h-4 w-4 transition-transform duration-500 hover:rotate-90 text-amber-500" />
              : <Moon className="h-4 w-4 transition-transform duration-500 hover:-rotate-12 text-violet-600 dark:text-violet-400" />}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-4 w-4" />
                {unreadCount() > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {unreadCount()}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 p-0 border border-border shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-bold text-foreground">Notifications</span>
                  {unreadCount() > 0 && (
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount()} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {unreadCount() > 0 && user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllRead(user.id)}
                      className="h-7 text-[10px] font-semibold text-muted-foreground hover:text-foreground px-2 cursor-pointer"
                    >
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant={isMuted ? 'outline' : 'default'}
                    size="sm"
                    onClick={handleTogglePushAlerts}
                    className={`h-7 text-[10px] font-semibold gap-1 px-2.5 cursor-pointer transition-colors ${
                      isMuted
                        ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        : pushPermission === 'granted'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                    title={
                      pushPermission !== 'granted'
                        ? 'Click to enable desktop push alerts'
                        : isMuted
                        ? 'Click to enable push alerts'
                        : 'Click to mute push alerts'
                    }
                  >
                    {isMuted ? (
                      <>
                        <BellOff className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                        Muted
                      </>
                    ) : pushPermission === 'granted' ? (
                      <>
                        <BellRing className="h-3 w-3" />
                        Active
                      </>
                    ) : (
                      <>
                        <Bell className="h-3 w-3" />
                        Enable
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
                {notifications.length === 0 ? (
                  <div className="p-6 text-xs text-muted-foreground text-center">
                    No new notifications. Everything is up to date!
                  </div>
                ) : (
                  notifications.slice(0, 20).map((n) => {
                    const isQuoteNotif = n.title?.includes('Quotation') || n.title?.includes('Quote') || n.title?.includes('QT-') || n.message?.includes('QT-') || n.message?.includes('Quotation') || n.message?.includes('Quote')
                    const targetPath = isQuoteNotif ? `/quotes/${n.deal_id}` : `/deals/${n.deal_id}`

                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id)
                          if (n.deal_id) navigate(targetPath)
                        }}
                        className={`p-3 text-left transition-colors cursor-pointer ${n.is_read ? 'bg-background hover:bg-muted/30' : 'bg-primary/5 hover:bg-primary/10'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                              <span className={`text-xs ${n.is_read ? 'font-medium text-foreground' : 'font-bold text-foreground'}`}>
                                {n.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-2">{n.message}</p>
                            <span className="text-[10px] font-semibold text-slate-400 mt-1 block">{formatRelative(n.created_at)}</span>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(n.id)
                            }}
                            className="h-6 w-6 shrink-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            title="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Interactive Action Buttons */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40">
                          {n.deal_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(n.id)
                                navigate(targetPath)
                              }}
                              className="h-7 text-[10px] font-semibold px-2.5 gap-1 border-border text-foreground hover:bg-muted cursor-pointer"
                            >
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              View Details
                            </Button>
                          )}

                        {(user?.role === 'sales_head' || user?.role === 'admin') && n.type === 'approval' && n.deal_id && (
                          <Button
                            size="sm"
                            onClick={(e) => handleQuickApprove(e, n)}
                            className="h-7 text-[10px] font-semibold px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Quick Approve
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
                )}
              </div>

              {/* Turn off notification info footer & Help button */}
              <div className="px-3.5 py-2.5 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5 truncate">
                  <Info className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">Need help with browser notifications?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
                >
                  Guide &rarr;
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User account menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 pl-2 h-9">
                <Avatar className="h-7 w-7 md:h-8 md:w-8">
                  <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500 via-pink-500 to-cyan-400 text-white font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium leading-none">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {user ? ROLE_LABELS[user.role] : ''}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Browser Notification Guide Modal */}
      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
              <Lock className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-foreground">
                How to Enable Notifications in Browser
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              When notifications are blocked, your browser hides the automatic prompt. Follow these 4 easy steps to unblock them:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            <div className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/30">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
                1
              </div>
              <div className="text-xs">
                <p className="font-semibold text-foreground">Look at top address bar</p>
                <p className="text-muted-foreground mt-0.5">Find the address bar at the very top of your browser window where the website address is listed.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/30">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
                2
              </div>
              <div className="text-xs">
                <p className="font-semibold text-foreground flex items-center gap-1">
                  Click the Lock icon <Lock className="h-3 w-3 text-indigo-500 inline" /> or Tune icon
                </p>
                <p className="text-muted-foreground mt-0.5">Click the small lock 🔒 or tune icon on the far left side of the web address (before <code className="bg-muted px-1 rounded">http://...</code>).</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/30">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
                3
              </div>
              <div className="text-xs">
                <p className="font-semibold text-foreground">Toggle Notifications to ON</p>
                <p className="text-muted-foreground mt-0.5">In the menu that appears, locate <strong>Notifications</strong> and switch the toggle to <strong>ON</strong> or change from <strong>Block</strong> to <strong>Allow</strong>.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/30">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
                4
              </div>
              <div className="text-xs">
                <p className="font-semibold text-foreground">Refresh the page</p>
                <p className="text-muted-foreground mt-0.5">Click the browser reload button 🔄 or press <strong>F5</strong> on your keyboard to apply changes.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={checkPermissionState}
              className="text-xs gap-1.5 h-8 font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Check Status
            </Button>

            <Button
              size="sm"
              onClick={() => setShowHelpModal(false)}
              className="text-xs h-8 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
