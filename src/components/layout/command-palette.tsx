import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { FileText, LayoutDashboard, Plus, Search } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/auth-store'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

export const COMMAND_OPEN_EVENT = 'pricedesk:command-open'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const deals = useSelector((s: RootState) => s.deals.deals)

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

  const run = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 max-w-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="Search deals, pages, actions..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group heading="Navigation">
              <Command.Item
                onSelect={() => run('/dashboard')}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Command.Item>
              {user?.role === 'sales_rep' && (
                <Command.Item
                  onSelect={() => run('/deals/new')}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent"
                >
                  <Plus className="h-4 w-4" />
                  Create New Deal
                </Command.Item>
              )}
            </Command.Group>
            <Command.Group heading="Deals">
              {deals.slice(0, 8).map((deal) => (
                <Command.Item
                  key={deal.id}
                  value={`${deal.deal_number} ${deal.title} ${deal.customer_name}`}
                  onSelect={() => run(`/deals/${deal.id}`)}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent"
                >
                  <FileText className="h-4 w-4" />
                  <span>
                    {deal.deal_number} — {deal.title}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
