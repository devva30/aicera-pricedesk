import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { CommandPalette } from './command-palette'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const location = useLocation()

  const handleMenuToggle = () => {
    if (window.innerWidth < 1024) {
      setMobileOpen((prev) => !prev)
    } else {
      setDesktopCollapsed((prev) => !prev)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar — slides in on mobile, collapsible on desktop */}
      <Sidebar
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        isCollapsed={desktopCollapsed}
      />

      {/* Content area — offset by sidebar width on desktop */}
      <div
        className={cn(
          'transition-[padding] duration-200 ease-in-out flex flex-col min-h-screen print:pl-0',
          desktopCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        )}
      >
        <div className="print:hidden">
          <Header onMenuToggle={handleMenuToggle} />
        </div>
        <main className="p-3 sm:p-4 md:p-6 flex-1 overflow-x-hidden print:p-0">
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}


