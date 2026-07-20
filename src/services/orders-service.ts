import type { Order, DealItem, UserRole, OrderIncentiveDetails, OrderChecklist } from '@/types'
import { useAuthStore } from '@/stores/auth-store'
import { db } from '@/lib/firebase'
import { collection, doc, getDoc, getDocs, setDoc, query, orderBy } from 'firebase/firestore'
import { MOCK_DEALS } from '@/lib/mock-data'


const LOCAL_STORAGE_ORDERS_KEY = 'pricedesk_mock_orders'

// Initial mock order derived from the approved deal 'Manufacturing IoT Starter'
// Helper to calculate order progress and stage
export function calculateOrderProgress(checklist: OrderChecklist) {
  const gates = [
    checklist.customer_po_received,
    checklist.po_value_terms_verified,
    checklist.oem_quote_validity_checked,
    checklist.distributor_po_placed,
    checklist.oem_order_acknowledged,
    checklist.delivery_grn_done,
    checklist.installation_complete,
    checklist.invoice_raised,
    checklist.payment_terms_confirmed,
    checklist.payment_collected,
  ]
  const checkedCount = gates.filter(Boolean).length
  const pct_complete = Math.round((checkedCount / 10) * 100)

  let stage: 'EARLY' | 'IN PROGRESS' | 'ADVANCED' | 'CLOSED' = 'EARLY'
  if (pct_complete === 100) {
    stage = 'CLOSED'
  } else if (pct_complete >= 70) {
    stage = 'ADVANCED'
  } else if (pct_complete >= 40) {
    stage = 'IN PROGRESS'
  }

  return { pct_complete, stage }
}

// Initial mock orders derived from approved deals
const INITIAL_MOCK_ORDERS: Order[] = [
  {
    id: 'order-1001',
    order_number: 'ORD-2026-1001',
    deal_id: 'DEAL-2026-001',
    deal_number: 'DEAL-2026-001',
    version_number: 1,
    previous_versions: [],
    title: 'Adani Grid Solutions - Smart Edge Router Expansion',
    customer_name: 'Adani Grid Solutions',
    customer_id: 'CUST-1920',
    sales_rep_id: 'demo-sales',
    sales_rep_name: 'Arjun Mehta',
    oem: 'Cisco Systems & Schneider Electric',
    quote_number: 'QT-2026-001',
    po_number: 'PO/ADANI/2026/0891',
    vendor_po_number: 'VPO/CISCO/2026/102',
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    supplier_name: 'Ingram Micro India',
    supplier_invoice: 'INV-ING-8812',
    contact_person: 'Rajesh Shah',
    email: 'rajesh.shah@adani.com',
    phone: '+91 98200 11223',
    quoted_value: 3450000,
    payment_terms: '30 Days Net from GRN',
    expected_delivery_date: '2026-08-15',
    checklist: {
      customer_po_received: true,
      po_value_terms_verified: true,
      oem_quote_validity_checked: true,
      distributor_po_placed: true,
      oem_order_acknowledged: true,
      delivery_grn_done: true,
      installation_complete: true,
      invoice_raised: true,
      payment_terms_confirmed: true,
      payment_collected: true,
    },
    pct_complete: 100,
    stage: 'CLOSED',
    ops_owner: 'Chetan',
    order_status: 'Closed',
    items: [
      {
        id: 'item-101',
        product_name: 'Cisco Industrial Edge Routers IR1101',
        part_number: 'IR1101-K9',
        quantity: 50,
        quoted_price: 45000,
        transfer_price: 36000,
        oem: 'Cisco Systems',
      },
      {
        id: 'item-102',
        product_name: 'Schneider EcoStruxure Metering Gateway',
        part_number: 'EGX300',
        quantity: 10,
        quoted_price: 120000,
        transfer_price: 95000,
        oem: 'Schneider Electric',
      },
    ],
  },
  {
    id: 'order-1002',
    order_number: 'ORD-2026-1002',
    deal_id: 'DEAL-2026-002',
    deal_number: 'DEAL-2026-002',
    version_number: 1,
    previous_versions: [],
    title: 'Tata Logistics - Smart Factory NextGen Firewall Upgrade',
    customer_name: 'Tata Logistics Ltd.',
    customer_id: 'CUST-8842',
    sales_rep_id: 'demo-sales',
    sales_rep_name: 'Arjun Mehta',
    oem: 'Fortinet & HPE Aruba',
    quote_number: 'QT-2026-002',
    po_number: 'PO/TATA/2026/0412',
    vendor_po_number: 'VPO/FORTINET/2026/304',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    supplier_name: 'Redington India Ltd',
    supplier_invoice: 'INV-RED-9912',
    contact_person: 'Siddharth Rao',
    email: 'siddharth@tatalogistics.com',
    phone: '+91 98111 44556',
    quoted_value: 3460000,
    payment_terms: '45 Days Net',
    expected_delivery_date: '2026-08-25',
    checklist: {
      customer_po_received: true,
      po_value_terms_verified: true,
      oem_quote_validity_checked: true,
      distributor_po_placed: true,
      oem_order_acknowledged: true,
      delivery_grn_done: false,
      installation_complete: false,
      invoice_raised: false,
      payment_terms_confirmed: false,
      payment_collected: false,
    },
    pct_complete: 50,
    stage: 'IN PROGRESS',
    ops_owner: 'Bhoomika',
    order_status: 'Processing',
    items: [
      {
        id: 'item-201',
        product_name: 'FortiGate 600F Enterprise NextGen Firewall',
        part_number: 'FG-600F-BDL',
        quantity: 2,
        quoted_price: 650000,
        transfer_price: 510000,
        oem: 'Fortinet',
      },
      {
        id: 'item-202',
        product_name: 'Aruba CX 6300M 48-Port PoE Switch',
        part_number: 'JL658A',
        quantity: 12,
        quoted_price: 180000,
        transfer_price: 142000,
        oem: 'HPE Aruba',
      },
    ],
  },
  {
    id: 'order-1003',
    order_number: 'ORD-2026-1003',
    deal_id: 'DEAL-2026-003',
    deal_number: 'DEAL-2026-003',
    version_number: 1,
    previous_versions: [],
    title: 'Reliance Retail - Cloud POS Terminal Infrastructure',
    customer_name: 'Reliance Retail Ltd.',
    customer_id: 'CUST-5291',
    sales_rep_id: 'demo-sales-2',
    sales_rep_name: 'Kavita Reddy',
    oem: 'Dell Technologies & Zebra',
    quote_number: 'QT-2026-003',
    po_number: 'PO/RELIANCE/2026/9910',
    vendor_po_number: 'VPO/DELL/2026/501',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    supplier_name: 'Redington India Ltd',
    contact_person: 'Anil Kapoor',
    email: 'anil.k@relianceretail.com',
    phone: '+91 98333 77889',
    quoted_value: 5800000,
    payment_terms: '30 Days Net',
    expected_delivery_date: '2026-09-05',
    checklist: {
      customer_po_received: true,
      po_value_terms_verified: true,
      oem_quote_validity_checked: true,
      distributor_po_placed: true,
      oem_order_acknowledged: true,
      delivery_grn_done: true,
      installation_complete: true,
      invoice_raised: true,
      payment_terms_confirmed: false,
      payment_collected: false,
    },
    pct_complete: 80,
    stage: 'ADVANCED',
    ops_owner: 'Bhoomika',
    order_status: 'Processing',
    items: [
      {
        id: 'item-301',
        product_name: 'Dell OptiPlex 7010 Micro POS Workstation',
        part_number: 'OPT-7010-POS',
        quantity: 80,
        quoted_price: 55000,
        transfer_price: 43000,
        oem: 'Dell Technologies',
      },
      {
        id: 'item-302',
        product_name: 'Zebra TC57x Touch Industrial Handheld Scanner',
        part_number: 'TC57HO-1PEZU4P-A6',
        quantity: 35,
        quoted_price: 40000,
        transfer_price: 31000,
        oem: 'Zebra',
      },
    ],
  },
  {
    id: 'order-1004',
    order_number: 'ORD-2026-1004',
    deal_id: 'DEAL-2026-006',
    deal_number: 'DEAL-2026-006',
    version_number: 1,
    previous_versions: [],
    title: 'Bharti Airtel - 5G Core Tower Monitoring Sensors',
    customer_name: 'Bharti Airtel Enterprise',
    customer_id: 'CUST-6102',
    sales_rep_id: 'demo-sales-3',
    sales_rep_name: 'Rohan Verma',
    oem: 'Palo Alto Networks & Schneider',
    quote_number: 'QT-2026-004',
    po_number: 'PO/AIRTEL/2026/1023',
    vendor_po_number: 'VPO/PALOALTO/2026/901',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    supplier_name: 'Ingram Micro India',
    contact_person: 'Sunil Mittal Desk',
    email: 'procurement@airtel.com',
    phone: '+91 98444 11223',
    quoted_value: 9500000,
    payment_terms: '60 Days Net',
    expected_delivery_date: '2026-09-30',
    checklist: {
      customer_po_received: true,
      po_value_terms_verified: true,
      oem_quote_validity_checked: false,
      distributor_po_placed: false,
      oem_order_acknowledged: false,
      delivery_grn_done: false,
      installation_complete: false,
      invoice_raised: false,
      payment_terms_confirmed: false,
      payment_collected: false,
    },
    pct_complete: 20,
    stage: 'EARLY',
    ops_owner: 'Deekshit',
    order_status: 'Processing',
    items: [
      {
        id: 'item-401',
        product_name: 'Palo Alto PA-3410 NextGen Firewall Appliance',
        part_number: 'PAN-PA-3410',
        quantity: 5,
        quoted_price: 1500000,
        transfer_price: 1180000,
        oem: 'Palo Alto Networks',
      },
      {
        id: 'item-402',
        product_name: 'Schneider NetShelter SX Enclosure Rack 42U',
        part_number: 'AR3100',
        quantity: 10,
        quoted_price: 200000,
        transfer_price: 160000,
        oem: 'Schneider Electric',
      },
    ],
  },
  {
    id: 'order-1005',
    order_number: 'ORD-2026-1005',
    deal_id: 'DEAL-2026-010',
    deal_number: 'DEAL-2026-010',
    version_number: 1,
    previous_versions: [],
    title: 'Wipro Enterprises - Cybersecurity SOC Monitoring Hardware',
    customer_name: 'Wipro Enterprises',
    customer_id: 'CUST-4921',
    sales_rep_id: 'demo-sales-2',
    sales_rep_name: 'Kavita Reddy',
    oem: 'Fortinet',
    quote_number: 'QT-2026-005',
    po_number: 'PO/WIPRO/2026/5541',
    vendor_po_number: 'VPO/FORTINET/2026/882',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    supplier_name: 'Redington India Ltd',
    supplier_invoice: 'INV-RED-7721',
    contact_person: 'Ramesh Krishnan',
    email: 'ramesh.k@wipro.com',
    phone: '+91 98555 99001',
    quoted_value: 5120000,
    payment_terms: '30 Days Net',
    expected_delivery_date: '2026-08-01',
    checklist: {
      customer_po_received: true,
      po_value_terms_verified: true,
      oem_quote_validity_checked: true,
      distributor_po_placed: true,
      oem_order_acknowledged: true,
      delivery_grn_done: true,
      installation_complete: true,
      invoice_raised: true,
      payment_terms_confirmed: true,
      payment_collected: true,
    },
    pct_complete: 100,
    stage: 'CLOSED',
    ops_owner: 'Chetan',
    order_status: 'Closed',
    items: [
      {
        id: 'item-501',
        product_name: 'FortiAnalyzer 1000F Log Collector',
        part_number: 'FAZ-1000F',
        quantity: 4,
        quoted_price: 1280000,
        transfer_price: 1010000,
        oem: 'Fortinet',
      },
    ],
  },
]

let memoryOrdersCache: Order[] | null = null

export function invalidateOrdersCache() {
  memoryOrdersCache = null
}

// Fetch helper to read local storage mock orders list
function getMockOrders(): Order[] {
  if (memoryOrdersCache) {
    return memoryOrdersCache
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY)
    const parsed = raw ? JSON.parse(raw) : [...INITIAL_MOCK_ORDERS]
    const updated = parsed.map((o: any) => {
      const ch = o.checklist || {
        customer_po_received: false,
        po_value_terms_verified: false,
        oem_quote_validity_checked: false,
        distributor_po_placed: false,
        oem_order_acknowledged: false,
        delivery_grn_done: false,
        installation_complete: false,
        invoice_raised: false,
        payment_terms_confirmed: false,
        payment_collected: false,
      }
      
      // If there are legacy/old checklist fields, map them to new ones if necessary
      const cl: OrderChecklist = {
        customer_po_received: ch.customer_po_received !== undefined ? ch.customer_po_received : !!(ch.customer_po_received_sales || ch.customer_po_received_finance),
        po_value_terms_verified: ch.po_value_terms_verified !== undefined ? ch.po_value_terms_verified : !!(ch.commercials_validated_sales || ch.commercials_validated_finance),
        oem_quote_validity_checked: ch.oem_quote_validity_checked !== undefined ? ch.oem_quote_validity_checked : !!(ch.supplier_quote_approved_sales || ch.supplier_quote_approved_finance),
        distributor_po_placed: ch.distributor_po_placed !== undefined ? ch.distributor_po_placed : !!(ch.supplier_po_released_sales || ch.supplier_po_released_finance),
        oem_order_acknowledged: ch.oem_order_acknowledged !== undefined ? ch.oem_order_acknowledged : !!(ch.order_acknowledged_sales || ch.order_acknowledged_finance),
        delivery_grn_done: ch.delivery_grn_done !== undefined ? ch.delivery_grn_done : false,
        installation_complete: ch.installation_complete !== undefined ? ch.installation_complete : false,
        invoice_raised: ch.invoice_raised !== undefined ? ch.invoice_raised : false,
        payment_terms_confirmed: ch.payment_terms_confirmed !== undefined ? ch.payment_terms_confirmed : false,
        payment_collected: ch.payment_collected !== undefined ? ch.payment_collected : false,
        remarks: ch.remarks || {}
      }

      const { pct_complete, stage } = calculateOrderProgress(cl)
      let order_status = o.order_status || 'Processing'
      if (pct_complete === 100) {
        order_status = 'Closed'
      } else if (order_status === 'Closed') {
        order_status = 'Processing'
      }

      // Self-healing migration for deal-based orders:
      // If order items have quoted_price equal to transfer_price (or missing), look up the deal
      // and restore the true quoted_price to get proper margins/incentives on the dashboard.
      let healedItems = o.items || []
      if (o.deal_id) {
        const deal = MOCK_DEALS.find((d) => d.id === o.deal_id)
        if (deal && deal.items && deal.items.length > 0) {
          healedItems = (o.items || []).map((item: DealItem) => {
            const matchedDealItem = deal.items.find(
              (di) => di.product_name.toLowerCase() === item.product_name.toLowerCase()
            )
            if (matchedDealItem && (item.quoted_price === item.transfer_price || !item.quoted_price)) {
              return {
                ...item,
                quoted_price: matchedDealItem.quoted_price
              }
            }
            return item
          })
        }
      }

      return {
        ...o,
        checklist: cl,
        pct_complete,
        stage,
        ops_owner: o.ops_owner || null,
        order_status,
        items: healedItems
      }
    })
    if (!raw || JSON.stringify(parsed) !== JSON.stringify(updated)) {
      saveMockOrders(updated)
    }
    memoryOrdersCache = updated
    return updated
  } catch (e) {
    console.error('Failed to load mock orders from localStorage:', e)
    return [...INITIAL_MOCK_ORDERS]
  }
}

// Persist orders list helper
function saveMockOrders(orders: Order[]) {
  memoryOrdersCache = orders
  try {
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders))
  } catch (e) {
    console.error('Failed to save mock orders to localStorage:', e)
  }
}

export async function fetchOrders(role: UserRole, userId: string): Promise<Order[]> {
  if (useAuthStore.getState().isDemo) {
    const orders = getMockOrders()
    if (role === 'sales_rep') {
      return orders.filter((o) => o.sales_rep_id === userId)
    }
    return orders // Finance sees all orders
  }

  // Live Firestore fetch
  try {
    const ordersCol = collection(db, 'orders')
    const q = query(ordersCol, orderBy('created_at', 'desc'))
    const snap = await getDocs(q)
    const list: Order[] = []
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Order)
    })
    if (role === 'sales_rep') {
      return list.filter((o) => o.sales_rep_id === userId)
    }
    return list
  } catch (e) {
    console.error('Failed to fetch orders from firestore:', e)
    return []
  }
}

export async function fetchOrderById(id: string): Promise<Order | null> {
  if (useAuthStore.getState().isDemo) {
    const orders = getMockOrders()
    return orders.find((o) => o.id === id) || null
  }

  // Live Firestore fetch
  try {
    const docSnap = await getDoc(doc(db, 'orders', id))
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...docSnap.data() } as Order
  } catch (e) {
    console.error('Failed to fetch order by id from firestore:', e)
    return null
  }
}

export async function saveOrder(order: Partial<Order> & { items: DealItem[] }, userId: string): Promise<Order> {
  const isDemo = useAuthStore.getState().isDemo
  const id = order.id || `order-${Date.now()}`
  const authUser = useAuthStore.getState().user

  const checklist = order.checklist || {
    customer_po_received: false,
    po_value_terms_verified: false,
    oem_quote_validity_checked: false,
    distributor_po_placed: false,
    oem_order_acknowledged: false,
    delivery_grn_done: false,
    installation_complete: false,
    invoice_raised: false,
    payment_terms_confirmed: false,
    payment_collected: false,
  }

  const { pct_complete, stage } = calculateOrderProgress(checklist)
  
  let order_status = order.order_status || 'Processing'
  if (pct_complete === 100) {
    order_status = 'Closed'
  } else if (order_status === 'Closed') {
    order_status = 'Processing'
  }

  const newOrder: Order = {
    id,
    order_number: order.order_number || `ORD-2026-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
    deal_id: order.deal_id || '',
    deal_number: order.deal_number || '',
    version_number: order.version_number ?? 1,
    previous_versions: order.previous_versions ?? [],
    title: order.title || 'Untitled Order',
    customer_name: order.customer_name || '',
    customer_id: order.customer_id || null,
    sales_rep_id: order.sales_rep_id || userId,
    sales_rep_name: order.sales_rep_name || authUser?.full_name || 'Sales Rep',
    oem: order.oem || '',
    quote_number: order.quote_number || null,
    po_number: order.po_number || null,
    created_at: order.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: order.items,
    supplier_name: order.supplier_name || '',
    supplier_invoice: order.supplier_invoice || '',
    contact_person: order.contact_person || '',
    email: order.email || '',
    phone: order.phone || '',
    quoted_value: order.quoted_value || 0,
    payment_terms: order.payment_terms || '',
    expected_delivery_date: order.expected_delivery_date || '',
    checklist,
    pct_complete,
    stage,
    ops_owner: order.ops_owner || null,
    order_status,
    incentive_details: order.incentive_details ?? null,
    customer_po_file: order.customer_po_file ?? null,
    vendor_po_generated_at: order.vendor_po_generated_at ?? null,
    vendor_po_number: order.vendor_po_number ?? null,
    is_standalone: order.is_standalone ?? false,
    discount_pct: order.discount_pct ?? 0,
    cgst_pct: order.cgst_pct ?? 9,
    sgst_pct: order.sgst_pct ?? 9,
    igst_pct: order.igst_pct ?? 0,
    shipping_charge: order.shipping_charge ?? 0,
    notes: order.notes ?? '',
    terms_conditions: order.terms_conditions ?? '',
    vendor_address: order.vendor_address ?? null,
    delivery_challan: order.delivery_challan ?? null,
  }

  if (isDemo) {
    const list = getMockOrders()
    const index = list.findIndex((o) => o.id === id)
    if (index !== -1) {
      list[index] = newOrder
    } else {
      list.unshift(newOrder)
    }
    saveMockOrders(list)
    return newOrder
  }

  // Live Firestore save
  try {
    await setDoc(doc(db, 'orders', id), newOrder)
    return newOrder
  } catch (e) {
    console.error('Failed to save order to firestore:', e)
    throw e
  }
}

export async function saveIncentiveDetails(
  orderId: string,
  details: OrderIncentiveDetails
): Promise<void> {
  const isDemo = useAuthStore.getState().isDemo

  if (isDemo) {
    const list = getMockOrders()
    const index = list.findIndex((o) => o.id === orderId)
    if (index !== -1) {
      list[index] = { ...list[index], incentive_details: details, updated_at: new Date().toISOString() }
      saveMockOrders(list)
    }
    return
  }

  // Live Firestore update
  try {
    const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore')
    await updateDoc(firestoreDoc(db, 'orders', orderId), {
      incentive_details: details,
      updated_at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('Failed to save incentive details to firestore:', e)
    throw e
  }
}

export async function deleteOrder(id: string, deletedBy?: string): Promise<void> {
  const isDemo = useAuthStore.getState().isDemo
  memoryOrdersCache = null // Invalidate memory cache so subsequent calls re-fetch clean list

  // Fetch order first so we can notify the creator
  const orderSnap = isDemo ? null : await (async () => {
    try {
      const { getDoc, doc: fsDoc } = await import('firebase/firestore')
      const snap = await getDoc(fsDoc(db, 'orders', id))
      return snap.exists() ? snap.data() : null
    } catch { return null }
  })()

  if (isDemo) {
    const list = getMockOrders()
    const order = list.find((o) => o.id === id)
    // Notify the order's sales rep if deleted by someone else
    if (order && deletedBy && deletedBy !== order.sales_rep_id) {
      const { appendMockNotification } = await import('@/lib/mock-data')
      appendMockNotification({
        user_id: order.sales_rep_id,
        deal_id: order.deal_id,
        title: 'Your order was deleted',
        message: `Order ${order.order_number} — "${order.title}" has been deleted by an administrator.`,
        type: 'status_update',
      })
    }
    const index = list.findIndex((o) => o.id === id)
    if (index !== -1) {
      list.splice(index, 1)
      saveMockOrders(list)
    }
    return
  }

  try {
    const { deleteDoc, doc: firestoreDoc, setDoc: fsSetDoc } = await import('firebase/firestore')
    await deleteDoc(firestoreDoc(db, 'orders', id))

    // Notify the order creator if deleted by someone else
    if (orderSnap && deletedBy && deletedBy !== orderSnap.sales_rep_id) {
      try {
        const notifId = `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`
        await fsSetDoc(firestoreDoc(db, 'notifications', notifId), {
          user_id: orderSnap.sales_rep_id,
          deal_id: orderSnap.deal_id || null,
          title: 'Your order was deleted',
          message: `Order ${orderSnap.order_number} — "${orderSnap.title}" has been deleted by an administrator.`,
          type: 'status_update',
          is_read: false,
          created_at: new Date().toISOString(),
        })
      } catch (err) {
        console.error('Failed to write order deletion notification:', err)
      }
    }
  } catch (e) {
    console.error('Failed to delete order from firestore:', e)
    throw e
  }
}

export async function deleteOrdersByDealId(dealId: string, dealNumber?: string): Promise<void> {
  const isDemo = useAuthStore.getState().isDemo
  memoryOrdersCache = null
  if (isDemo) {
    const list = getMockOrders()
    const updated = list.filter(
      (o) => o.deal_id !== dealId && (!dealNumber || o.deal_number !== dealNumber)
    )
    saveMockOrders(updated)
    return
  }

  try {
    const { getDocs, query, where, collection, deleteDoc, doc: firestoreDoc } = await import('firebase/firestore')
    const ordersCol = collection(db, 'orders')
    const q = query(ordersCol, where('deal_id', '==', dealId))
    const snap = await getDocs(q)
    const deletes = snap.docs.map((d) => deleteDoc(firestoreDoc(db, 'orders', d.id)))
    await Promise.all(deletes)
  } catch (e) {
    console.error('Failed to delete orders by deal id:', e)
  }
}

export async function deleteDeliveryChallan(orderId: string): Promise<void> {
  const isDemo = useAuthStore.getState().isDemo
  if (isDemo) {
    const list = getMockOrders()
    const index = list.findIndex((o) => o.id === orderId)
    if (index !== -1) {
      delete list[index].delivery_challan
      saveMockOrders(list)
    }
    return
  }

  try {
    const { updateDoc, doc: firestoreDoc, deleteField } = await import('firebase/firestore')
    await updateDoc(firestoreDoc(db, 'orders', orderId), {
      delivery_challan: deleteField(),
      updated_at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('Failed to delete delivery challan from firestore:', e)
    throw e
  }
}
