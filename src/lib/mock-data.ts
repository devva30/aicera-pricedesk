import type { Deal, DealAudit, Notification, User } from '@/types'

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

export const MOCK_DEALS: Deal[] = [
  {
    id: 'DEAL-2026-001',
    deal_number: 'DEAL-2026-001',
    title: 'Adani Grid Solutions - Smart Edge Router Expansion',
    customer_name: 'Adani Grid Solutions',
    customer_id: 'CUST-1920',
    created_by: 'demo-sales',
    sales_rep_name: 'Arjun Mehta',
    sales_head_id: 'demo-head',
    status: 'approved',
    is_quote_only: false,
    version_number: 1,
    previous_versions: [],
    oem: 'Cisco Systems & Schneider Electric',
    payment_terms: '30 Days Net from GRN',
    expected_delivery_date: '2026-08-15',
    created_at: new Date(now - 86400000 * 14).toISOString(),
    updated_at: new Date(now - 86400000 * 12).toISOString(),
    items: [
      {
        id: 'item-101',
        product_name: 'Cisco Industrial Edge Routers IR1101',
        part_number: 'IR1101-K9',
        quantity: 4,
        quoted_price: 14500,
        transfer_price: 11200,
        oem: 'Cisco Systems',
      },
      {
        id: 'item-102',
        product_name: 'Schneider EcoStruxure Metering Gateway',
        part_number: 'EGX300',
        quantity: 2,
        quoted_price: 28000,
        transfer_price: 21500,
        oem: 'Schneider Electric',
      },
    ],
    overheads: [
      { id: 'ovh-1', name: 'Freight & Express Transit', amount: 3500 },
      { id: 'ovh-2', name: 'On-site Technical Commissioning', amount: 6500 },
    ],
    requires_technical: true,
    technical_approved_by: 'demo-technical',
    technical_approved_at: new Date(now - 86400000 * 13).toISOString(),
    finance_approved_by: 'demo-finance',
    finance_approved_at: new Date(now - 86400000 * 13).toISOString(),
    sales_head_approved_by: 'demo-head',
    sales_head_approved_at: new Date(now - 86400000 * 12).toISOString(),
  },
  {
    id: 'DEAL-2026-002',
    deal_number: 'DEAL-2026-002',
    title: 'Tata Logistics - Smart Factory NextGen Firewall Upgrade',
    customer_name: 'Tata Logistics Ltd.',
    customer_id: 'CUST-8842',
    created_by: 'demo-sales',
    sales_rep_name: 'Arjun Mehta',
    sales_head_id: 'demo-head',
    status: 'approved',
    is_quote_only: false,
    version_number: 1,
    previous_versions: [],
    oem: 'Fortinet & HPE Aruba',
    payment_terms: '45 Days Net',
    expected_delivery_date: '2026-08-25',
    created_at: new Date(now - 86400000 * 10).toISOString(),
    updated_at: new Date(now - 86400000 * 8).toISOString(),
    items: [
      {
        id: 'item-201',
        product_name: 'FortiGate 600F Enterprise NextGen Firewall',
        part_number: 'FG-600F-BDL',
        quantity: 1,
        quoted_price: 165000,
        transfer_price: 132000,
        oem: 'Fortinet',
      },
      {
        id: 'item-202',
        product_name: 'Aruba CX 6300M 48-Port PoE Switch',
        part_number: 'JL658A',
        quantity: 3,
        quoted_price: 32000,
        transfer_price: 24500,
        oem: 'HPE Aruba',
      },
    ],
    overheads: [
      { id: 'ovh-3', name: 'Implementation & Configuration', amount: 12000 },
    ],
    requires_technical: true,
    technical_approved_by: 'demo-technical',
    technical_approved_at: new Date(now - 86400000 * 9).toISOString(),
    finance_approved_by: 'demo-finance',
    finance_approved_at: new Date(now - 86400000 * 9).toISOString(),
    sales_head_approved_by: 'demo-head',
    sales_head_approved_at: new Date(now - 86400000 * 8).toISOString(),
  },
  {
    id: 'DEAL-2026-003',
    deal_number: 'DEAL-2026-003',
    title: 'Reliance Retail - Cloud POS Terminal Infrastructure',
    customer_name: 'Reliance Retail Ltd.',
    customer_id: 'CUST-5291',
    created_by: 'demo-sales-2',
    sales_rep_name: 'Kavita Reddy',
    sales_head_id: 'demo-head',
    status: 'pending_finance',
    is_quote_only: false,
    version_number: 1,
    previous_versions: [],
    oem: 'Dell Technologies & Zebra',
    payment_terms: '30 Days Net',
    expected_delivery_date: '2026-09-05',
    created_at: new Date(now - 86400000 * 7).toISOString(),
    updated_at: new Date(now - 86400000 * 1).toISOString(),
    items: [
      {
        id: 'item-301',
        product_name: 'Dell OptiPlex 7010 Micro POS Workstation',
        part_number: 'OPT-7010-POS',
        quantity: 5,
        quoted_price: 24000,
        transfer_price: 18500,
        oem: 'Dell Technologies',
      },
      {
        id: 'item-302',
        product_name: 'Zebra TC57x Touch Industrial Handheld Scanner',
        part_number: 'TC57HO-1PEZU4P-A6',
        quantity: 4,
        quoted_price: 16000,
        transfer_price: 12200,
        oem: 'Zebra',
      },
    ],
    overheads: [
      { id: 'ovh-4', name: 'Staging & Custom Image Flashing', amount: 8000 },
    ],
    requires_technical: true,
    technical_approved_by: 'demo-technical',
    technical_approved_at: new Date(now - 86400000 * 2).toISOString(),
  },
  {
    id: 'DEAL-2026-004',
    deal_number: 'DEAL-2026-004',
    title: 'HDFC Capital - Core Data Center PowerEdge Server Refresh',
    customer_name: 'HDFC Capital Partners',
    customer_id: 'CUST-9285',
    created_by: 'demo-sales-2',
    sales_rep_name: 'Kavita Reddy',
    sales_head_id: 'demo-head',
    status: 'pending_technical',
    is_quote_only: false,
    version_number: 1,
    previous_versions: [],
    oem: 'HP Enterprise & VMware',
    payment_terms: '15 Days Advance',
    expected_delivery_date: '2026-09-10',
    created_at: new Date(now - 86400000 * 3).toISOString(),
    updated_at: new Date(now - 86400000 * 1).toISOString(),
    items: [
      {
        id: 'item-401',
        product_name: 'HPE ProLiant DL380 Gen11 Rack Server 64-Core',
        part_number: 'P52534-B21',
        quantity: 1,
        quoted_price: 210000,
        transfer_price: 165000,
        oem: 'HP Enterprise',
      },
      {
        id: 'item-402',
        product_name: 'VMware vSphere Enterprise Plus License Pack',
        part_number: 'VMW-VSP-ENT',
        quantity: 1,
        quoted_price: 125000,
        transfer_price: 98000,
        oem: 'VMware',
      },
    ],
    overheads: [
      { id: 'ovh-5', name: 'Rack Installation & SAN Migration', amount: 15000 },
    ],
    requires_technical: true,
  },
  {
    id: 'DEAL-2026-005',
    deal_number: 'DEAL-2026-005',
    title: 'Apollo Hospitals - Telemedicine Video Endpoint Suite',
    customer_name: 'Apollo Hospitals Enterprise',
    customer_id: 'CUST-3942',
    created_by: 'demo-sales',
    sales_rep_name: 'Arjun Mehta',
    sales_head_id: 'demo-head',
    status: 'pending_sales_head',
    is_quote_only: false,
    version_number: 1,
    previous_versions: [],
    oem: 'Cisco Systems & Polycom',
    payment_terms: '30 Days Net',
    expected_delivery_date: '2026-09-15',
    created_at: new Date(now - 86400000 * 2).toISOString(),
    updated_at: new Date(now - 86400000 * 1).toISOString(),
    items: [
      {
        id: 'item-501',
        product_name: 'Cisco Webex Room Kit Pro Telemedicine System',
        part_number: 'CS-KITPRO-K9',
        quantity: 2,
        quoted_price: 115000,
        transfer_price: 90000,
        oem: 'Cisco Systems',
      },
    ],
    overheads: [
      { id: 'ovh-6', name: 'Clinical Integration & Training', amount: 12000 },
    ],
    requires_technical: true,
    technical_approved_by: 'demo-technical',
    technical_approved_at: new Date(now - 86400000 * 1).toISOString(),
    finance_approved_by: 'demo-finance',
    finance_approved_at: new Date(now - 86400000 * 1).toISOString(),
  },
  {
    id: 'DEAL-2026-006',
    deal_number: 'DEAL-2026-006',
    title: 'Bharti Airtel - 5G Core Tower Monitoring Sensors',
    customer_name: 'Bharti Airtel Enterprise',
    customer_id: 'CUST-6102',
    created_by: 'demo-sales-2',
    sales_rep_name: 'Kavita Reddy',
    sales_head_id: 'demo-head',
    status: 'approved',
    is_quote_only: false,
    version_number: 1,
    previous_versions: [],
    oem: 'Palo Alto Networks & Schneider',
    payment_terms: '60 Days Net',
    expected_delivery_date: '2026-09-30',
    created_at: new Date(now - 86400000 * 6).toISOString(),
    updated_at: new Date(now - 86400000 * 1).toISOString(),
    items: [
      {
        id: 'item-601',
        product_name: 'Palo Alto PA-3410 NextGen Firewall Appliance',
        part_number: 'PAN-PA-3410',
        quantity: 1,
        quoted_price: 185000,
        transfer_price: 145000,
        oem: 'Palo Alto Networks',
      },
      {
        id: 'item-602',
        product_name: 'Schneider NetShelter SX Enclosure Rack 42U',
        part_number: 'AR3100',
        quantity: 2,
        quoted_price: 22000,
        transfer_price: 17000,
        oem: 'Schneider Electric',
      },
    ],
    overheads: [
      { id: 'ovh-7', name: 'On-site Telecom Deployment', amount: 16000 },
    ],
    requires_technical: true,
    technical_approved_by: 'demo-technical',
    technical_approved_at: new Date(now - 86400000 * 4).toISOString(),
    finance_approved_by: 'demo-finance',
    finance_approved_at: new Date(now - 86400000 * 3).toISOString(),
    sales_head_approved_by: 'demo-head',
    sales_head_approved_at: new Date(now - 86400000 * 1).toISOString(),
  },
  {
    id: 'DEAL-2026-007',
    deal_number: 'DEAL-2026-007',
    title: 'L&T Construction - Smart Project Site Wi-Fi Mesh',
    customer_name: 'L&T Construction',
    customer_id: 'CUST-5510',
    created_by: 'demo-sales',
    sales_rep_name: 'Arjun Mehta',
    sales_head_id: 'demo-head',
    status: 'changes_requested',
    is_quote_only: false,
    version_number: 1,
    previous_versions: [],
    oem: 'HPE Aruba',
    payment_terms: '30 Days Net',
    expected_delivery_date: '2026-09-20',
    created_at: new Date(now - 86400000 * 4).toISOString(),
    updated_at: new Date(now - 86400000 * 1).toISOString(),
    items: [
      {
        id: 'item-701',
        product_name: 'Aruba AP-575 Outdoor Rugged Wi-Fi 6 Access Point',
        part_number: 'R4H19A',
        quantity: 4,
        quoted_price: 18500,
        transfer_price: 14200,
        oem: 'HPE Aruba',
      },
    ],
    overheads: [],
    requires_technical: true,
  },
  {
    id: 'DEAL-2026-010',
    deal_number: 'DEAL-2026-010',
    title: 'Wipro Enterprises - Cybersecurity SOC Monitoring Hardware',
    customer_name: 'Wipro Enterprises',
    customer_id: 'CUST-4921',
    created_by: 'demo-sales-2',
    sales_rep_name: 'Kavita Reddy',
    sales_head_id: 'demo-head',
    status: 'approved',
    is_quote_only: false,
    version_number: 1,
    previous_versions: [],
    oem: 'Fortinet',
    payment_terms: '30 Days Net',
    expected_delivery_date: '2026-08-01',
    created_at: new Date(now - 86400000 * 16).toISOString(),
    updated_at: new Date(now - 86400000 * 2).toISOString(),
    items: [
      {
        id: 'item-1001',
        product_name: 'FortiAnalyzer 1000F Log Collector',
        part_number: 'FAZ-1000F',
        quantity: 1,
        quoted_price: 195000,
        transfer_price: 152000,
        oem: 'Fortinet',
      },
    ],
    overheads: [
      { id: 'ovh-8', name: 'SOC Deployment Support', amount: 15000 },
    ],
    requires_technical: true,
    technical_approved_by: 'demo-technical',
    technical_approved_at: new Date(now - 86400000 * 14).toISOString(),
    finance_approved_by: 'demo-finance',
    finance_approved_at: new Date(now - 86400000 * 13).toISOString(),
    sales_head_approved_by: 'demo-head',
    sales_head_approved_at: new Date(now - 86400000 * 12).toISOString(),
  },
]

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

export const MOCK_AUDIT_LOG: DealAudit[] = [
  auditEntry({ deal_id: 'DEAL-2026-001', action: 'created', actor_name: 'Arjun Mehta', actor_role: 'sales_rep', daysAgo: 14 }),
  auditEntry({ deal_id: 'DEAL-2026-001', action: 'approved_technical', actor_name: 'Vikram Patel', actor_role: 'technical', daysAgo: 13 }),
  auditEntry({ deal_id: 'DEAL-2026-001', action: 'approved_finance', actor_name: 'Priya Sharma', actor_role: 'finance', daysAgo: 13 }),
  auditEntry({ deal_id: 'DEAL-2026-001', action: 'approved_sales_head', actor_name: 'Ananya Iyer', actor_role: 'sales_head', daysAgo: 12 }),
  auditEntry({ deal_id: 'DEAL-2026-002', action: 'created', actor_name: 'Arjun Mehta', actor_role: 'sales_rep', daysAgo: 10 }),
  auditEntry({ deal_id: 'DEAL-2026-002', action: 'approved_sales_head', actor_name: 'Ananya Iyer', actor_role: 'sales_head', daysAgo: 8 }),
  auditEntry({ deal_id: 'DEAL-2026-003', action: 'created', actor_name: 'Kavita Reddy', actor_role: 'sales_rep', daysAgo: 3 }),
  auditEntry({ deal_id: 'DEAL-2026-003', action: 'approved_technical', actor_name: 'Vikram Patel', actor_role: 'technical', daysAgo: 2 }),
  auditEntry({ deal_id: 'DEAL-2026-004', action: 'created', actor_name: 'Kavita Reddy', actor_role: 'sales_rep', daysAgo: 2 }),
  auditEntry({ deal_id: 'DEAL-2026-005', action: 'created', actor_name: 'Arjun Mehta', actor_role: 'sales_rep', daysAgo: 1 }),
]

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

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-ops-101',
    user_id: 'demo-ops-chetan',
    deal_id: 'DEAL-2026-001',
    title: 'New Order Worksheet Assigned',
    message: 'Order ORD-2026-001 (Tata Logistics Core Infra) has been assigned to you for execution & checklist sign-off.',
    type: 'approval',
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'notif-ops-102',
    user_id: 'demo-ops-chetan',
    deal_id: 'DEAL-2026-002',
    title: 'PO Delivery Checklist Update',
    message: 'Order ORD-2026-002 (Apollo Hospitals HIS) requires Vendor PO verification and Delivery Gate checklist sign-off.',
    type: 'status_update',
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'notif-ops-103',
    user_id: 'demo-ops-chetan',
    deal_id: 'DEAL-2026-003',
    title: 'New Approved Deal Assigned',
    message: 'Deal DEAL-2026-003 (Reliance Retail SD-WAN) was approved by Sales Head and assigned to you as Ops Executive.',
    type: 'status_update',
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
]

export function updateMockDeal(id: string, updates: Partial<Deal>) {
  const index = MOCK_DEALS.findIndex((d) => d.id === id)
  if (index !== -1) {
    MOCK_DEALS[index] = { ...MOCK_DEALS[index], ...updates }
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
  MOCK_DEALS.unshift(deal)
  persistMockDeals()
}

// ─── Initial Mock Quotes ──────────────────────────────────────────────────────

export const MOCK_QUOTES: Deal[] = [
  {
    id: 'QT-2026-001',
    deal_number: 'QT-2026-001',
    parent_deal_id: 'DEAL-2026-001',
    title: 'Adani Grid Solutions - Smart Edge Router Quote',
    customer_name: 'Adani Grid Solutions',
    customer_id: 'CUST-1920',
    total_revenue: 124000,
    total_cost: 98000,
    net_margin_pct: 20.97,
    gross_margin_pct: 20.97,
    created_by: 'demo-sales',
    sales_rep_id: 'demo-sales',
    sales_rep_name: 'Arjun Mehta',
    sales_head_id: 'demo-head',
    status: 'approved',
    is_quote_only: true,
    version_number: 1,
    previous_versions: [],
    oem: 'Cisco Systems',
    payment_terms: '30 Days Net from GRN',
    expected_delivery_date: '2026-08-15',
    created_at: new Date(now - 86400000 * 10).toISOString(),
    updated_at: new Date(now - 86400000 * 2).toISOString(),
    items: [
      {
        id: 'qitem-1001',
        product_name: 'Cisco Industrial Edge Routers IR1101',
        part_number: 'IR1101-K9',
        quantity: 4,
        quoted_price: 14500,
        transfer_price: 11200,
        oem: 'Cisco Systems',
      },
    ],
    overheads: [],
    requires_technical: true,
    tech_approved_by: 'demo-technical',
    tech_approved_at: new Date(now - 86400000 * 8).toISOString(),
    finance_approved_by: 'demo-finance',
    finance_approved_at: new Date(now - 86400000 * 6).toISOString(),
    sales_head_approved_by: 'demo-head',
    sales_head_approved_at: new Date(now - 86400000 * 2).toISOString(),
  },
  {
    id: 'QT-2026-002',
    deal_number: 'QT-2026-002',
    parent_deal_id: 'DEAL-2026-002',
    title: 'Tata Logistics - Smart Factory Firewall Commercial Proposal',
    customer_name: 'Tata Logistics Ltd.',
    customer_id: 'CUST-8842',
    total_revenue: 273000,
    total_cost: 217500,
    net_margin_pct: 20.33,
    gross_margin_pct: 20.33,
    created_by: 'demo-sales',
    sales_rep_id: 'demo-sales',
    sales_rep_name: 'Arjun Mehta',
    sales_head_id: 'demo-head',
    status: 'approved',
    is_quote_only: true,
    version_number: 1,
    previous_versions: [],
    oem: 'Fortinet & HPE Aruba',
    payment_terms: '45 Days Net',
    expected_delivery_date: '2026-08-25',
    created_at: new Date(now - 86400000 * 8).toISOString(),
    updated_at: new Date(now - 86400000 * 7).toISOString(),
    items: [
      {
        id: 'qitem-2001',
        product_name: 'FortiGate 600F Enterprise NextGen Firewall',
        part_number: 'FG-600F-BDL',
        quantity: 1,
        quoted_price: 165000,
        transfer_price: 132000,
        oem: 'Fortinet',
      },
    ],
    overheads: [],
    requires_technical: true,
    finance_approved_by: 'demo-finance',
    finance_approved_at: new Date(now - 86400000 * 7).toISOString(),
  },
  {
    id: 'QT-2026-003',
    deal_number: 'QT-2026-003',
    parent_deal_id: 'DEAL-2026-003',
    title: 'Reliance Retail - Cloud POS Hardware Commercial Quote',
    customer_name: 'Reliance Retail Ltd.',
    customer_id: 'CUST-5291',
    total_revenue: 192000,
    total_cost: 149500,
    net_margin_pct: 22.14,
    gross_margin_pct: 22.14,
    created_by: 'demo-sales-2',
    sales_rep_id: 'demo-sales-2',
    sales_rep_name: 'Kavita Reddy',
    sales_head_id: 'demo-head',
    status: 'approved',
    is_quote_only: true,
    version_number: 1,
    previous_versions: [],
    oem: 'Dell Technologies & Zebra',
    payment_terms: '30 Days Net',
    expected_delivery_date: '2026-09-05',
    created_at: new Date(now - 86400000 * 5).toISOString(),
    updated_at: new Date(now - 86400000 * 4).toISOString(),
    items: [
      {
        id: 'qitem-3001',
        product_name: 'Dell OptiPlex 7010 Micro POS Workstation',
        part_number: 'OPT-7010-POS',
        quantity: 5,
        quoted_price: 24000,
        transfer_price: 18500,
        oem: 'Dell Technologies',
      },
    ],
    overheads: [],
    requires_technical: true,
  },
  {
    id: 'QT-2026-004',
    deal_number: 'QT-2026-004',
    parent_deal_id: 'DEAL-2026-006',
    title: 'Bharti Airtel - 5G Core Tower Security Proposal',
    customer_name: 'Bharti Airtel Enterprise',
    customer_id: 'CUST-6102',
    total_revenue: 245000,
    total_cost: 195000,
    net_margin_pct: 20.41,
    gross_margin_pct: 20.41,
    created_by: 'demo-sales-2',
    sales_rep_id: 'demo-sales-2',
    sales_rep_name: 'Kavita Reddy',
    sales_head_id: 'demo-head',
    status: 'approved',
    is_quote_only: true,
    version_number: 1,
    previous_versions: [],
    oem: 'Palo Alto Networks',
    payment_terms: '60 Days Net',
    expected_delivery_date: '2026-09-30',
    created_at: new Date(now - 86400000 * 4).toISOString(),
    updated_at: new Date(now - 86400000 * 3).toISOString(),
    items: [
      {
        id: 'qitem-4001',
        product_name: 'Palo Alto PA-3410 NextGen Firewall Appliance',
        part_number: 'PAN-PA-3410',
        quantity: 1,
        quoted_price: 185000,
        transfer_price: 145000,
        oem: 'Palo Alto Networks',
      },
    ],
    overheads: [],
    requires_technical: true,
  },
]
const LOCAL_STORAGE_QUOTES_KEY = 'pricedesk_mock_quotes'

export function persistMockQuotes() {
  try {
    localStorage.setItem(LOCAL_STORAGE_QUOTES_KEY, JSON.stringify(MOCK_QUOTES))
  } catch (e) {
    console.error('Error persisting quotes to localStorage:', e)
  }
}

export function updateMockQuote(id: string, updates: Partial<Deal>) {
  const index = MOCK_QUOTES.findIndex((q) => q.id === id)
  if (index !== -1) {
    MOCK_QUOTES[index] = { ...MOCK_QUOTES[index], ...updates }
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
}

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'CUST-8842', name: 'Tata Logistics Ltd.', created_at: new Date().toISOString() },
  { id: 'CUST-3942', name: 'Apollo Hospitals Enterprise', created_at: new Date().toISOString() },
  { id: 'CUST-5291', name: 'Reliance Retail Ltd.', created_at: new Date().toISOString() },
  { id: 'CUST-1029', name: 'Titan Manufacturing Ltd.', created_at: new Date().toISOString() },
  { id: 'CUST-9285', name: 'HDFC Capital Partners', created_at: new Date().toISOString() },
  { id: 'CUST-1920', name: 'Adani Grid Solutions', created_at: new Date().toISOString() },
  { id: 'CUST-3041', name: 'Infosys Technologies', created_at: new Date().toISOString() },
  { id: 'CUST-4921', name: 'Wipro Enterprises', created_at: new Date().toISOString() },
  { id: 'CUST-5510', name: 'L&T Construction', created_at: new Date().toISOString() },
]

const LOCAL_STORAGE_CUSTOMERS_KEY = 'pricedesk_mock_customers'

export function persistMockCustomers() {
  localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(MOCK_CUSTOMERS))
}

// Schema versioning to clear out messy or outdated test data on first load
const SCHEMA_VERSION = 'v6.0_reasonable_amounts_v2'
const LOCAL_STORAGE_VERSION_KEY = 'pricedesk_schema_version'

try {
  const currentVersion = localStorage.getItem(LOCAL_STORAGE_VERSION_KEY)
  if (currentVersion !== SCHEMA_VERSION) {
    localStorage.removeItem(LOCAL_STORAGE_DEALS_KEY)
    localStorage.removeItem(LOCAL_STORAGE_AUDIT_KEY)
    localStorage.removeItem(LOCAL_STORAGE_NOTIFS_KEY)
    localStorage.removeItem(LOCAL_STORAGE_CUSTOMERS_KEY)
    localStorage.removeItem(LOCAL_STORAGE_QUOTES_KEY)
    localStorage.removeItem('pricedesk_mock_orders')
    localStorage.removeItem('pricedesk_sales_targets')
    localStorage.removeItem('pricedesk_sales_settings')
    localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, SCHEMA_VERSION)
    // Force write clean initial mock data to localStorage
    persistMockDeals()
    persistMockAudit()
    persistMockNotifications()
    persistMockCustomers()
    persistMockQuotes()
  }
} catch (e) {
  console.error('Failed to handle schema version check:', e)
}

// Load initial values from localStorage if they exist
try {
  const storedDeals = localStorage.getItem(LOCAL_STORAGE_DEALS_KEY)
  if (storedDeals) {
    const parsed = JSON.parse(storedDeals)
    MOCK_DEALS.length = 0
    MOCK_DEALS.push(...parsed)
  }
} catch (e) {
  console.error('Failed to parse stored deals:', e)
}

try {
  const storedQuotes = localStorage.getItem(LOCAL_STORAGE_QUOTES_KEY)
  if (storedQuotes) {
    const parsed = JSON.parse(storedQuotes)
    MOCK_QUOTES.length = 0
    MOCK_QUOTES.push(...parsed)
  }
} catch (e) {
  console.error('Failed to parse stored quotes:', e)
}

try {
  const storedAudit = localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY)
  if (storedAudit) {
    const parsed = JSON.parse(storedAudit)
    MOCK_AUDIT_LOG.length = 0
    MOCK_AUDIT_LOG.push(...parsed)
  }
} catch (e) {
  console.error('Failed to parse stored audit log:', e)
}

try {
  const storedNotifs = localStorage.getItem(LOCAL_STORAGE_NOTIFS_KEY)
  if (storedNotifs) {
    const parsed = JSON.parse(storedNotifs)
    MOCK_NOTIFICATIONS.length = 0
    MOCK_NOTIFICATIONS.push(...parsed)
  }
} catch (e) {
  console.error('Failed to parse stored notifications:', e)
}

try {
  const storedCustomers = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY)
  if (storedCustomers) {
    const parsed = JSON.parse(storedCustomers)
    MOCK_CUSTOMERS.length = 0
    MOCK_CUSTOMERS.push(...parsed)
  }
} catch (e) {
  console.error('Failed to parse stored customers:', e)
}
