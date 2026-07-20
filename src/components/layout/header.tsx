import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, Moon, Sun, User, Search } from 'lucide-react'
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
  const { theme, setTheme, applyTheme } = useThemeStore()
  const { notifications, fetchNotifications, markAsRead, unreadCount } = useNotificationStore()

  useEffect(() => {
    applyTheme()
    if (user) fetchNotifications(user.id)
  }, [user, applyTheme, fetchNotifications])

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

  return (
    <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-3 md:px-6 gap-3">

      {/* Left: Hamburger menu toggle button (3-line options button) */}
      <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-1.5 lg:hidden">
          <img
            src="https://framerusercontent.com/images/AlNvsxkJzF8SFWwwytH2xsnL8uM.png"
            alt="PriceDesk Logo"
            className="h-6 w-6 rounded-md object-contain shrink-0"
          />
          <h1 className="text-sm font-bold aicera-gradient-text">PriceDesk</h1>
        </div>
      </div>

      {/* Search Input Trigger (Zoho style Global Search) */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('pricedesk:command-open'))}
          className="flex items-center w-full gap-2 px-3 py-1.5 text-xs text-muted-foreground border border-input rounded-lg bg-muted/40 hover:bg-muted/70 hover:text-foreground transition-all duration-200 outline-none text-left"
        >
          <Search className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span>Search deals, pages, actions...</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 ml-auto shadow-sm">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Center spacer for mobile */}
      <div className="flex-1 md:hidden" />

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
          <DropdownMenuContent align="end" className="w-72 md:w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No new notifications
              </div>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                  onClick={() => {
                    markAsRead(n.id)
                    if (n.deal_id) navigate(`/deals/${n.deal_id}`)
                  }}
                >
                  <span className={n.is_read ? 'font-normal text-sm' : 'font-semibold text-sm'}>
                    {n.title}
                  </span>
                  <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                  <span className="text-[10px] text-muted-foreground">{formatRelative(n.created_at)}</span>
                </DropdownMenuItem>
              ))
            )}
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
  )
}
