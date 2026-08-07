import type { Deal, DealAudit, Notification, User } from '@/types'

// ─── Notification Event Bus ───────────────────────────────────────────────────
// Allows the notification store to subscribe to new notifications
// without a circular dependency (mock-data ← notification-store ← mock-data)
type NotificationListener = (notif: Notification) => void
const _notificationListeners: NotificationListener[] = []
export function subscribeToMockNotifications(fn: NotificationListener): () => void {
  _notificationListeners.push(fn)
  return () => {
    const idx = _notificationListeners.indexOf(fn)
    if (idx !== -1) _notificationListeners.splice(idx, 1)
  }
}

export const DEMO_USERS: Record<string, User> = {
  sales: {
    id: 'demo-sales',
    email: 'arjun.mehta@pricedesk.in',
    full_name: 'Arjun Mehta',
    role: 'sales_rep',
    department: 'Enterprise Sales',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  sales_2: {
    id: 'demo-sales-2',
    email: 'kavita.reddy@pricedesk.in',
    full_name: 'Kavita Reddy',
    role: 'sales_rep',
    department: 'Regional Sales',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  finance: {
    id: 'demo-finance',
    email: 'priya.sharma@pricedesk.in',
    full_name: 'Priya Sharma',
    role: 'finance',
    department: 'Finance',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  technical: {
    id: 'demo-technical',
    email: 'vikram.patel@pricedesk.in',
    full_name: 'Vikram Patel',
    role: 'technical',
    department: 'Solutions Engineering',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  sales_head: {
    id: 'demo-head',
    email: 'ananya.iyer@pricedesk.in',
    full_name: 'Ananya Iyer',
    role: 'sales_head',
    department: 'Sales Leadership',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  admin: {
    id: 'demo-admin',
    email: 'admin@pricedesk.in',
    full_name: 'Rahul Kapoor',
    role: 'admin',
    department: 'IT Administration',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  chetan: {
    id: 'demo-ops-chetan',
    email: 'chetan@pricedesk.in',
    full_name: 'Chetan',
    role: 'ops',
    department: 'Operations & Procurement',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  bhoomika: {
    id: 'demo-ops-bhoomika',
    email: 'bhoomika@pricedesk.in',
    full_name: 'Bhoomika',
    role: 'ops',
    department: 'Operations & Procurement',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  deekshit: {
    id: 'demo-ops-deekshit',
    email: 'deekshit@pricedesk.in',
    full_name: 'Deekshit',
    role: 'ops',
    department: 'Operations & Procurement',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
}

const now = Date.now()

export const MOCK_DEALS: Deal[] = []

function auditEntry(
  partial: Omit<DealAudit, 'id' | 'created_at'> & { daysAgo: number }
): DealAudit {
  const deal = MOCK_DEALS.find((d) => d.id === partial.deal_id)
  return {
    id: `audit-${partial.deal_id}-${partial.action}-${partial.daysAgo}`,
    created_at: new Date(now - 86400000 * partial.daysAgo).toISOString(),
    deal_number: deal?.deal_number,
    deal_title: deal?.title,
    ...partial,
  }
}

export const MOCK_AUDIT_LOG: DealAudit[] = []

/** @deprecated use MOCK_AUDIT_LOG */
export const MOCK_AUDIT = MOCK_AUDIT_LOG

const LOCAL_STORAGE_DEALS_KEY = 'pricedesk_mock_deals'
const LOCAL_STORAGE_AUDIT_KEY = 'pricedesk_mock_audit_log'

export function persistMockDeals() {
  try {
    localStorage.setItem(LOCAL_STORAGE_DEALS_KEY, JSON.stringify(MOCK_DEALS))
  } catch (e) {
    console.error('Error persisting deals to localStorage:', e)
  }
}

export function persistMockAudit() {
  try {
    localStorage.setItem(LOCAL_STORAGE_AUDIT_KEY, JSON.stringify(MOCK_AUDIT_LOG))
  } catch (e) {
    console.error('Error persisting audit log to localStorage:', e)
  }
}

export function appendMockAudit(entry: Omit<DealAudit, 'id' | 'created_at' | 'deal_number' | 'deal_title'>) {
  const deal = MOCK_DEALS.find((d) => d.id === entry.deal_id) || MOCK_QUOTES.find((d) => d.id === entry.deal_id)
  const row: DealAudit = {
    ...entry,
    id: `audit-${Date.now()}`,
    created_at: new Date().toISOString(),
    deal_number: deal?.deal_number,
    deal_title: deal?.title,
  }
  MOCK_AUDIT_LOG.unshift(row)
  persistMockAudit()
}

export const MOCK_NOTIFICATIONS: Notification[] = []

export function updateMockDeal(id: string, updates: Partial<Deal>) {
  const index = MOCK_DEALS.findIndex((d) => d.id === id || d.deal_number === id || d.quote_number === id)
  if (index !== -1) {
    MOCK_DEALS[index] = { ...MOCK_DEALS[index], ...updates }
  } else {
    const qIdx = MOCK_QUOTES.findIndex((q) => q.id === id || q.deal_number === id || q.quote_number === id)
    if (qIdx !== -1) {
      const updated = { ...MOCK_QUOTES[qIdx], ...updates }
      if (!updated.is_quote_only) {
        MOCK_QUOTES.splice(qIdx, 1)
        persistMockQuotes()
        MOCK_DEALS.unshift(updated)
      } else {
        MOCK_QUOTES[qIdx] = updated
        persistMockQuotes()
      }
    }
  }
  persistMockDeals()
}

export function deleteMockDeal(id: string) {
  const deal = MOCK_DEALS.find((d) => d.id === id)
  const dealNumber = deal?.deal_number

  const index = MOCK_DEALS.findIndex((d) => d.id === id)
  if (index !== -1) {
    MOCK_DEALS.splice(index, 1)
  }
  persistMockDeals()

  // Cascading cleanup: Remove linked quotes in MOCK_QUOTES
  let qIndex = MOCK_QUOTES.findIndex((q) => q.parent_deal_id === id || q.id === id || (dealNumber && q.deal_number === dealNumber))
  while (qIndex !== -1) {
    MOCK_QUOTES.splice(qIndex, 1)
    qIndex = MOCK_QUOTES.findIndex((q) => q.parent_deal_id === id || q.id === id || (dealNumber && q.deal_number === dealNumber))
  }
  persistMockQuotes()
}

export function addMockDeal(deal: Deal) {
  const qIdx = MOCK_QUOTES.findIndex((q) => q.id === deal.id || (deal.deal_number && q.deal_number === deal.deal_number))
  if (qIdx !== -1) {
    MOCK_QUOTES.splice(qIdx, 1)
    persistMockQuotes()
  }
  const dIdx = MOCK_DEALS.findIndex((d) => d.id === deal.id || (deal.deal_number && d.deal_number === deal.deal_number))
  if (dIdx !== -1) {
    MOCK_DEALS[dIdx] = deal
  } else {
    MOCK_DEALS.unshift(deal)
  }
  persistMockDeals()
}

// ─── Initial Mock Quotes ──────────────────────────────────────────────────────

export const MOCK_QUOTES: Deal[] = []
const LOCAL_STORAGE_QUOTES_KEY = 'pricedesk_mock_quotes'

export function persistMockQuotes() {
  try {
    localStorage.setItem(LOCAL_STORAGE_QUOTES_KEY, JSON.stringify(MOCK_QUOTES))
  } catch (e) {
    console.error('Error persisting quotes to localStorage:', e)
  }
}

export function updateMockQuote(id: string, updates: Partial<Deal>) {
  const index = MOCK_QUOTES.findIndex((q) => q.id === id || q.deal_number === id || q.quote_number === id)
  if (index !== -1) {
    const updated = { ...MOCK_QUOTES[index], ...updates }
    if (!updated.is_quote_only) {
      MOCK_QUOTES.splice(index, 1)
      persistMockQuotes()
      MOCK_DEALS.unshift(updated)
      persistMockDeals()
      return
    }
    MOCK_QUOTES[index] = updated
  } else {
    const dIdx = MOCK_DEALS.findIndex((d) => d.id === id || d.deal_number === id || d.quote_number === id)
    if (dIdx !== -1) {
      const updated = { ...MOCK_DEALS[dIdx], ...updates }
      if (updated.is_quote_only) {
        MOCK_DEALS.splice(dIdx, 1)
        persistMockDeals()
        MOCK_QUOTES.unshift(updated)
        persistMockQuotes()
        return
      }
      MOCK_DEALS[dIdx] = updated
      persistMockDeals()
      return
    }
  }
  persistMockQuotes()
}

export function deleteMockQuote(id: string) {
  const quote = MOCK_QUOTES.find((q) => q.id === id)
  const quoteNumber = quote?.deal_number

  const index = MOCK_QUOTES.findIndex((q) => q.id === id)
  if (index !== -1) {
    MOCK_QUOTES.splice(index, 1)
  }
  persistMockQuotes()

  // Remove from MOCK_DEALS if present as quote
  const dIndex = MOCK_DEALS.findIndex((d) => d.id === id || (quoteNumber && d.deal_number === quoteNumber))
  if (dIndex !== -1) {
    MOCK_DEALS.splice(dIndex, 1)
    persistMockDeals()
  }
}

export function addMockQuote(quote: Deal) {
  MOCK_QUOTES.unshift(quote)
  persistMockQuotes()
}


const LOCAL_STORAGE_NOTIFS_KEY = 'pricedesk_notifications'

export function persistMockNotifications() {
  localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(MOCK_NOTIFICATIONS))
}

export function appendMockNotification(notif: Omit<Notification, 'id' | 'created_at' | 'is_read'>) {
  const newNotif: Notification = {
    ...notif,
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    is_read: false,
    created_at: new Date().toISOString(),
  }
  MOCK_NOTIFICATIONS.unshift(newNotif)
  persistMockNotifications()

  // Notify all subscribers (e.g. notification-store) synchronously
  for (const listener of _notificationListeners) {
    try { listener(newNotif) } catch { /* ignore */ }
  }

  // Persist to Firestore if live Firebase is active
  try {
    const isFirebase = Boolean(
      import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_API_KEY !== 'placeholder-key'
    )
    if (isFirebase) {
      import('./firebase').then(({ db }) => {
        import('firebase/firestore').then(({ doc, setDoc }) => {
          setDoc(doc(db, 'notifications', newNotif.id), newNotif).catch(console.error)
        })
      })
    }
  } catch (e) {
    console.error('Error writing notification to Firestore:', e)
  }

  // Trigger Browser Push Notification
  try {
    import('./audio-notifications').then(({ showBrowserNotification }) => {
      showBrowserNotification(newNotif.title, newNotif.message)
    })
  } catch (e) {
    console.warn('Notification trigger error:', e)
  }
}

// Customers Mock definitions
export interface Customer {
  id: string
  name: string
  created_at: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  billing_street?: string
  billing_city?: string
  billing_state?: string
  billing_code?: string
  billing_country?: string
  shipping_street?: string
  shipping_city?: string
  shipping_state?: string
  shipping_code?: string
  shipping_country?: string
}

export const MOCK_CUSTOMERS: Customer[] = []

const LOCAL_STORAGE_CUSTOMERS_KEY = 'pricedesk_mock_customers'

export function persistMockCustomers() {
  localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(MOCK_CUSTOMERS))
}

// Schema versioning to clear out messy or outdated test data on first load
const SCHEMA_VERSION = 'v7.0_clean_production_v1'
const LOCAL_STORAGE_VERSION_KEY = 'pricedesk_schema_version'

try {
  localStorage.removeItem(LOCAL_STORAGE_DEALS_KEY)
  localStorage.removeItem(LOCAL_STORAGE_AUDIT_KEY)
  localStorage.removeItem(LOCAL_STORAGE_NOTIFS_KEY)
  localStorage.removeItem(LOCAL_STORAGE_CUSTOMERS_KEY)
  localStorage.removeItem(LOCAL_STORAGE_QUOTES_KEY)
  localStorage.removeItem('pricedesk_mock_orders')
  localStorage.removeItem('pricedesk_sales_targets')
  localStorage.removeItem('pricedesk_sales_settings')
  localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, SCHEMA_VERSION)
} catch (e) {
  console.error('Failed to handle schema version check:', e)
}
