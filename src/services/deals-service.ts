import type { Deal, DealAudit, DealItem, DealOverhead, DealStatus, UserRole } from '@/types'
import { calculateMargins } from '@/lib/margins'
import { getNextStatus } from '@/lib/workflow'
import { DEMO_USERS, MOCK_AUDIT_LOG, MOCK_DEALS, addMockDeal, deleteMockDeal, appendMockAudit, updateMockDeal, appendMockNotification, MOCK_QUOTES, addMockQuote, updateMockQuote, deleteMockQuote } from '@/lib/mock-data'
import { fetchSettings } from './targets-service'
import type { AuditAction, User } from '@/types'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth-store'
import { sendWorkflowEmail } from '@/services/email-service'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
} from 'firebase/firestore'

function isFirebaseConfigured(): boolean {
  const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY
  const firebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
  return Boolean(
    firebaseApiKey &&
    firebaseApiKey !== 'placeholder-key' &&
    firebaseProjectId &&
    firebaseProjectId !== 'placeholder-project'
  )
}

export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as any
  if (typeof data !== 'object') return data

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any
  }

  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value === undefined) {
      continue
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      result[key] = sanitizeForFirestore(value)
    } else {
      result[key] = value
    }
  }
  return result as T
}

function filterDealsByRole(deals: Deal[], role: UserRole, userId: string): Deal[] {
  const currentUser = useAuthStore.getState().user
  const userEmail = currentUser?.email?.toLowerCase()
  const currentUserId = currentUser?.id || userId

  switch (role) {
    case 'sales_rep':
      return deals.filter((d) => {
        if (!d.created_by) return true
        const cb = String(d.created_by).toLowerCase()
        const uid = String(currentUserId).toLowerCase()
        const em = userEmail ? String(userEmail).toLowerCase() : ''
        const creatorId = d.creator?.id ? String(d.creator.id).toLowerCase() : ''
        const creatorEmail = d.creator?.email ? String(d.creator.email).toLowerCase() : ''
        return (
          cb === uid ||
          (em && cb === em) ||
          (creatorId && creatorId === uid) ||
          (em && creatorEmail === em) ||
          cb === 'demo-sales' ||
          uid === 'demo-sales'
        )
      })
    case 'technical':
      return deals.filter(
        (d) =>
          d.requires_technical &&
          d.status !== 'draft'
      )
    case 'finance':
      return deals.filter(
        (d) =>
          d.status !== 'draft' &&
          (!d.requires_technical || d.status !== 'pending_technical')
      )
    case 'sales_head':
      return deals.filter((d) =>
        ['pending_sales_head', 'approved', 'rejected'].includes(d.status)
      )
    case 'ops': {
      const currentUser = useAuthStore.getState().user
      const opsName = currentUser?.full_name || 'Chetan'
      return deals.filter(
        (d) =>
          d.assigned_ops_owner === opsName ||
          d.ops_owner === opsName
      )
    }
    case 'admin':
      return deals
    default:
      return deals
  }
}

export async function fetchDeals(role: UserRole, userId: string): Promise<Deal[]> {
  if (useAuthStore.getState().isDemo) {
    return filterDealsByRole([...MOCK_DEALS], role, userId)
  }

  try {
    const dealsCol = collection(db, 'deals')
    const q = query(dealsCol, orderBy('updated_at', 'desc'))
    const snap = await getDocs(q)
    const list: Deal[] = []

    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Deal)
    })

    return filterDealsByRole(list, role, userId)
  } catch (err) {
    console.error('fetchDeals query error:', err)
    try {
      const snap = await getDocs(collection(db, 'deals'))
      const list: Deal[] = []
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Deal)
      })
      list.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
      return filterDealsByRole(list, role, userId)
    } catch (e) {
      console.error('fetchDeals fallback error:', e)
      return filterDealsByRole([...MOCK_DEALS], role, userId)
    }
  }
}

export async function fetchQuotes(role: UserRole, userId: string): Promise<Deal[]> {
  if (useAuthStore.getState().isDemo) {
    return filterDealsByRole([...MOCK_QUOTES], role, userId)
  }

  const quotesCol = collection(db, 'quotes')
  const q = query(quotesCol, orderBy('updated_at', 'desc'))
  const snap = await getDocs(q)
  const list: Deal[] = []

  snap.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() } as Deal)
  })

  return filterDealsByRole(list, role, userId)
}

export async function fetchQuotesByDealId(dealId: string): Promise<Deal[]> {
  if (useAuthStore.getState().isDemo) {
    return MOCK_QUOTES.filter((q) => q.parent_deal_id === dealId)
  }

  const quotesCol = collection(db, 'quotes')
  const q = query(quotesCol, where('parent_deal_id', '==', dealId))
  const snap = await getDocs(q)
  const list: Deal[] = []

  snap.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() } as Deal)
  })

  return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

import { deleteOrdersByDealId } from './orders-service'

export async function deleteDeal(id: string, deletedBy?: string): Promise<void> {
  const deal = await fetchDealById(id).catch(() => null)
  const dealNumber = deal?.deal_number

  // Cascading cleanup of linked orders
  await deleteOrdersByDealId(id, dealNumber).catch(() => {})

  if (useAuthStore.getState().isDemo) {
    // Notify the creator if someone else deleted it
    if (deal && deletedBy && deletedBy !== deal.created_by) {
      appendMockNotification({
        user_id: deal.created_by,
        deal_id: id,
        title: 'Your deal was deleted',
        message: `Deal ${deal.deal_number} — "${deal.title}" has been deleted by an administrator.`,
        type: 'status_update',
      })
    }
    deleteMockDeal(id)
    return
  }

  try {
    await deleteDoc(doc(db, 'deals', id))
    const quotesCol = collection(db, 'quotes')
    const q = query(quotesCol, where('parent_deal_id', '==', id))
    const snap = await getDocs(q)
    const quoteDeletes = snap.docs.map((d) => deleteDoc(doc(db, 'quotes', d.id)))
    await Promise.all(quoteDeletes)

    // Notify the deal creator if deleted by someone else
    if (deal && deletedBy && deletedBy !== deal.created_by) {
      try {
        const notifId = `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`
        await setDoc(doc(db, 'notifications', notifId), {
          user_id: deal.created_by,
          deal_id: id,
          title: 'Your deal was deleted',
          message: `Deal ${deal.deal_number} — "${deal.title}" has been deleted by an administrator.`,
          type: 'status_update',
          is_read: false,
          created_at: new Date().toISOString(),
        })
      } catch (err) {
        console.error('Failed to write deal deletion notification:', err)
      }
    }
  } catch (e) {
    console.error('Error deleting deal from Firestore:', e)
  }
}

export async function deleteQuote(id: string, deletedBy?: string): Promise<void> {
  const quote = await fetchDealById(id).catch(() => null)

  if (useAuthStore.getState().isDemo) {
    // Notify the creator if someone else deleted it
    if (quote && deletedBy && deletedBy !== quote.created_by) {
      appendMockNotification({
        user_id: quote.created_by,
        deal_id: id,
        title: 'Your quote was deleted',
        message: `Quote ${quote.quote_number || quote.deal_number} — "${quote.title}" has been deleted by an administrator.`,
        type: 'status_update',
      })
    }
    deleteMockQuote(id)
    return
  }
  try {
    await deleteDoc(doc(db, 'quotes', id))
    await deleteDoc(doc(db, 'deals', id)).catch(() => {})

    // Notify the quote creator if deleted by someone else
    if (quote && deletedBy && deletedBy !== quote.created_by) {
      try {
        const notifId = `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`
        await setDoc(doc(db, 'notifications', notifId), {
          user_id: quote.created_by,
          deal_id: id,
          title: 'Your quote was deleted',
          message: `Quote ${quote.quote_number || quote.deal_number} — "${quote.title}" has been deleted by an administrator.`,
          type: 'status_update',
          is_read: false,
          created_at: new Date().toISOString(),
        })
      } catch (err) {
        console.error('Failed to write quote deletion notification:', err)
      }
    }
  } catch (e) {
    console.error('Error deleting quote from Firestore:', e)
  }
}

export async function fetchDealById(id: string): Promise<Deal | null> {
  // 1. First check Redux store for instantaneous match (avoids network flash / latency)
  try {
    const { store } = await import('@/store')
    const stateDeals = store.getState()?.deals?.deals || []
    const reduxMatch = stateDeals.find((d: Deal) => d.id === id || d.deal_number === id || d.quote_number === id)
    if (reduxMatch) return reduxMatch
  } catch {}

  // 2. Check local mock storage cache
  const mockDeal = MOCK_DEALS.find((d) => d.id === id || d.deal_number === id || d.quote_number === id)
  if (mockDeal) return mockDeal
  const mockQuote = MOCK_QUOTES.find((q) => q.id === id || q.deal_number === id || q.quote_number === id)
  if (mockQuote) return mockQuote

  // 3. Query Firestore if Firebase is configured
  if (isFirebaseConfigured() && !useAuthStore.getState().isDemo) {
    try {
      let docSnap = await getDoc(doc(db, 'deals', id))
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Deal
      }

      docSnap = await getDoc(doc(db, 'quotes', id))
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Deal
      }

      let q = query(collection(db, 'deals'), where('deal_number', '==', id))
      let snap = await getDocs(q)
      if (!snap.empty) {
        const d = snap.docs[0]
        return { id: d.id, ...d.data() } as Deal
      }

      q = query(collection(db, 'deals'), where('quote_number', '==', id))
      snap = await getDocs(q)
      if (!snap.empty) {
        const d = snap.docs[0]
        return { id: d.id, ...d.data() } as Deal
      }

      q = query(collection(db, 'quotes'), where('deal_number', '==', id))
      snap = await getDocs(q)
      if (!snap.empty) {
        const d = snap.docs[0]
        return { id: d.id, ...d.data() } as Deal
      }

      q = query(collection(db, 'quotes'), where('quote_number', '==', id))
      snap = await getDocs(q)
      if (!snap.empty) {
        const d = snap.docs[0]
        return { id: d.id, ...d.data() } as Deal
      }
    } catch (e: any) {
      console.error('fetchDealById error:', e?.code, e?.message, e)
    }
  }

  return null
}

export async function fetchDealAudit(dealId: string): Promise<DealAudit[]> {
  if (useAuthStore.getState().isDemo) {
    return MOCK_AUDIT_LOG.filter((a) => a.deal_id === dealId)
  }

  const auditCol = collection(db, 'deal_audit')
  const q = query(auditCol, where('deal_id', '==', dealId))
  const snap = await getDocs(q)
  const list: DealAudit[] = []

  snap.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() } as DealAudit)
  })

  return list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

export async function saveDeal(
  deal: Partial<Deal> & {
    items: DealItem[]
    overheads: DealOverhead[]
    _isApprovedResubmit?: boolean
    _versionNumber?: number
  },
  userId: string
): Promise<Deal> {
  const isApprovedResubmit = deal._isApprovedResubmit ?? false
  const versionNumber = deal._versionNumber ?? 1

  const safeNum = (v: any) => {
    const n = Number(v)
    return isNaN(n) ? 0 : n
  }

  const normalizedItems = (deal.items ?? []).map((item) => ({
    ...item,
    quantity: safeNum(item.quantity),
    transfer_price: safeNum(item.transfer_price),
    quoted_price: safeNum(item.quoted_price),
    sub_items: (item.sub_items ?? []).map((sub: any) => ({
      id: sub.id || `sub-${Date.now()}-${Math.random()}`,
      part_number: sub.part_number ?? '',
      brand: sub.brand ?? '',
      description: sub.description ?? '',
      quantity: safeNum(sub.quantity),
      unit_cost: safeNum(sub.unit_cost),
      unit_price: safeNum(sub.unit_price),
    }))
  }))

  const normalizedOverheads = (deal.overheads ?? []).map((overhead) => ({
    ...overhead,
    amount: safeNum(overhead.amount),
    percentage_value: overhead.percentage_value == null ? undefined : safeNum(overhead.percentage_value),
  }))

  const margins = calculateMargins(normalizedItems, normalizedOverheads)

  let totalRevenue = margins.totalRevenue
  if (deal.is_quote_only) {
    const discPct = safeNum(deal.discount_pct)
    const discountAmt = totalRevenue * (discPct / 100)
    const shipping = safeNum(deal.shipping_charge)
    const taxableAmt = totalRevenue - discountAmt + shipping
    const taxPct = safeNum(deal.cgst_pct) + safeNum(deal.sgst_pct) + safeNum(deal.igst_pct)
    const taxAmt = taxableAmt * (taxPct / 100)
    totalRevenue = taxableAmt + taxAmt
  }

  if (useAuthStore.getState().isDemo || !isFirebaseConfigured()) {
    const id = deal.id ?? `deal-${Date.now()}`
    const creatorUser = Object.values(DEMO_USERS).find((u) => u.id === userId)
    const isQuoteOnly = deal.is_quote_only ?? false
    const defaultDocNum = isQuoteOnly
      ? `QT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`
      : `PD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`
    const finalDocNumber = isQuoteOnly
      ? (deal.quote_number || defaultDocNum)
      : (deal.deal_number || defaultDocNum)

    const saved: Deal = {
      id,
      deal_number: finalDocNumber,
      title: deal.title ?? 'Untitled Deal',
      customer_name: deal.customer_name ?? '',
      customer_id: deal.customer_id,
      parent_deal_id: deal.parent_deal_id ?? null,
      description: deal.description,
      status: deal.status ?? 'draft',
      created_by: deal.created_by || userId,
      currency: deal.currency ?? 'INR',
      requires_technical: deal.requires_technical ?? false,
      oem: deal.oem ?? null,
      quote_number: isQuoteOnly ? finalDocNumber : (deal.quote_number ?? null),
      is_quote_only: isQuoteOnly,
      total_revenue: totalRevenue,
      total_cost: margins.totalCost,
      gross_margin_pct: margins.grossMarginPct,
      net_margin_pct: margins.netMarginPct,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: normalizedItems,
      overheads: normalizedOverheads,
      creator: creatorUser,
      previous_versions: deal.previous_versions ?? [],
      discount_pct: safeNum(deal.discount_pct),
      cgst_pct: safeNum(deal.cgst_pct),
      sgst_pct: safeNum(deal.sgst_pct),
      igst_pct: safeNum(deal.igst_pct),
      shipping_charge: safeNum(deal.shipping_charge),
      notes: deal.notes,
      terms_conditions: deal.terms_conditions,
      declaration: deal.declaration,
      validity_period: safeNum(deal.validity_period),
      bom_data: deal.bom_data,
      sla_data: deal.sla_data,
      timeline_data: deal.timeline_data,
      contact_name: deal.contact_name ?? null,
      quote_stage: deal.quote_stage ?? null,
      carrier: deal.carrier ?? null,
      valid_till: deal.valid_till ?? null,
      billing_street: deal.billing_street ?? null,
      billing_city: deal.billing_city ?? null,
      billing_state: deal.billing_state ?? null,
      billing_code: deal.billing_code ?? null,
      billing_country: deal.billing_country ?? null,
      shipping_street: deal.shipping_street ?? null,
      shipping_city: deal.shipping_city ?? null,
      shipping_state: deal.shipping_state ?? null,
      shipping_code: deal.shipping_code ?? null,
      shipping_country: deal.shipping_country ?? null,
    }
    if (deal.id) {
      if (saved.is_quote_only) {
        updateMockQuote(id, saved)
      } else {
        updateMockDeal(id, saved)
      }

      if (isApprovedResubmit) {
        // Approved deal was edited & resubmitted — add audit + notify all reviewers with version context
        const versionLabel = `v${versionNumber}`
        const repName = creatorUser?.full_name ?? 'Sales Rep'
        const salesRepId = saved.created_by || userId

        appendMockAudit({
          deal_id: id,
          user_id: userId,
          action: 'resubmitted',
          to_status: saved.status,
          comment: `Revised deal (${versionLabel}) re-submitted for approval. Previous approved version saved as snapshot.`,
          user: creatorUser,
        })

        if (saved.status === 'pending_technical') {
          appendMockNotification({
            user_id: 'demo-technical',
            deal_id: id,
            title: `Revised Deal Re-submitted for Technical Review 🔄`,
            message: `${saved.deal_number} (${versionLabel}) — "${saved.title}" is a revised version of a previously approved deal and requires fresh Technical Review.`,
            type: 'approval',
          })
        } else if (saved.status === 'pending_finance') {
          appendMockNotification({
            user_id: 'demo-finance',
            deal_id: id,
            title: `Revised Deal Re-submitted for Finance Review 🔄`,
            message: `${saved.deal_number} (${versionLabel}) — "${saved.title}" is a revised version of a previously approved deal and requires fresh Finance Review.`,
            type: 'approval',
          })
        }
        // Always notify admin of approved-deal revision
        appendMockNotification({
          user_id: 'demo-admin',
          deal_id: id,
          title: `Approved Deal Revised — ${saved.deal_number}`,
          message: `${saved.deal_number} (${versionLabel}) — "${saved.title}" was edited by ${repName} and re-entered the approval pipeline. Previous approved version saved as reference.`,
          type: 'status_update',
        })
        // Notify sales rep confirming the resubmission
        appendMockNotification({
          user_id: salesRepId,
          deal_id: id,
          title: `Deal Revised & Re-submitted 📋`,
          message: `Your revised deal ${saved.deal_number} (${versionLabel}) — "${saved.title}" has been re-submitted for approval. The previous approved version is saved as a reference snapshot.`,
          type: 'status_update',
        })
      } else if (saved.status === 'pending_technical') {
        appendMockNotification({
          user_id: 'demo-technical',
          deal_id: id,
          title: 'New deal awaiting review',
          message: `${saved.deal_number} — ${saved.title} has been submitted and is awaiting Technical Review.`,
          type: 'approval',
        })
      } else if (saved.status === 'pending_finance') {
        appendMockNotification({
          user_id: 'demo-finance',
          deal_id: id,
          title: 'New deal awaiting review',
          message: `${saved.deal_number} — ${saved.title} has been submitted and is awaiting Finance Review.`,
          type: 'approval',
        })
      }
    } else {
      if (saved.is_quote_only) {
        addMockQuote(saved)
      } else {
        addMockDeal(saved)
      }
      appendMockAudit({
        deal_id: id,
        user_id: userId,
        action: (['pending_finance', 'pending_technical'].includes(deal.status ?? '') ? 'submitted' : 'created') as any,
        to_status: deal.status ?? 'draft',
        user: creatorUser,
      })
      if (saved.status === 'pending_technical') {
        appendMockNotification({
          user_id: 'demo-technical',
          deal_id: id,
          title: 'New deal awaiting review',
          message: `${saved.deal_number} — ${saved.title} has been submitted by ${creatorUser?.full_name ?? 'Sales Rep'} and is awaiting Technical Review.`,
          type: 'approval',
        })
      } else if (saved.status === 'pending_finance') {
        appendMockNotification({
          user_id: 'demo-finance',
          deal_id: id,
          title: 'New deal awaiting review',
          message: `${saved.deal_number} — ${saved.title} has been submitted by ${creatorUser?.full_name ?? 'Sales Rep'} and is awaiting Finance Review.`,
          type: 'approval',
        })
      }
      checkAndNotifyBelowFloorMargin(saved).catch(err => console.error('Below margin check error:', err))
    }
    return saved
  }

  // Live Firebase database save
  const id = deal.id ?? `deal-${Date.now()}`
  const isQuoteOnly = deal.is_quote_only ?? false
  const defaultDocNum = isQuoteOnly
    ? `QT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`
    : `PD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`
  const finalDocNumber = isQuoteOnly
    ? (deal.quote_number || defaultDocNum)
    : (deal.deal_number || defaultDocNum)

  const saved: Deal = {
    id,
    deal_number: finalDocNumber,
    title: deal.title ?? 'Untitled Deal',
    customer_name: deal.customer_name ?? '',
    customer_id: deal.customer_id,
    parent_deal_id: deal.parent_deal_id ?? null,
    description: deal.description ?? '',
    status: deal.status ?? 'draft',
    created_by: deal.created_by || userId,
    currency: deal.currency ?? 'INR',
    requires_technical: deal.requires_technical ?? false,
    oem: deal.oem ?? null,
    quote_number: isQuoteOnly ? finalDocNumber : (deal.quote_number ?? null),
    is_quote_only: isQuoteOnly,
    total_revenue: totalRevenue,
    total_cost: margins.totalCost,
    gross_margin_pct: margins.grossMarginPct,
    net_margin_pct: margins.netMarginPct,
    created_at: deal.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: normalizedItems,
    overheads: normalizedOverheads,
    creator: undefined,
    previous_versions: deal.previous_versions ?? [],
    discount_pct: safeNum(deal.discount_pct),
    cgst_pct: safeNum(deal.cgst_pct),
    sgst_pct: safeNum(deal.sgst_pct),
    igst_pct: safeNum(deal.igst_pct),
    shipping_charge: safeNum(deal.shipping_charge),
    notes: deal.notes,
    terms_conditions: deal.terms_conditions,
    declaration: deal.declaration,
    validity_period: safeNum(deal.validity_period),
    bom_data: deal.bom_data,
    sla_data: deal.sla_data,
    timeline_data: deal.timeline_data,
    contact_name: deal.contact_name ?? null,
    quote_stage: deal.quote_stage ?? null,
    carrier: deal.carrier ?? null,
    valid_till: deal.valid_till ?? null,
    billing_street: deal.billing_street ?? null,
    billing_city: deal.billing_city ?? null,
    billing_state: deal.billing_state ?? null,
    billing_code: deal.billing_code ?? null,
    billing_country: deal.billing_country ?? null,
    shipping_street: deal.shipping_street ?? null,
    shipping_city: deal.shipping_city ?? null,
    shipping_state: deal.shipping_state ?? null,
    shipping_code: deal.shipping_code ?? null,
    shipping_country: deal.shipping_country ?? null,
  }

  try {
    // Fetch creator user details to cache inside the deal doc
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)
    const creatorUser = userSnap.exists() ? { id: userId, ...userSnap.data() } as User : undefined
    saved.creator = creatorUser

    if (saved.is_quote_only) {
      addMockQuote(saved)
      await setDoc(doc(db, 'quotes', id), sanitizeForFirestore(saved))
    } else {
      addMockDeal(saved)
      await setDoc(doc(db, 'deals', id), sanitizeForFirestore(saved))
    }

    // Write audit entry
    const auditId = `audit-${Date.now()}`
    await setDoc(doc(db, 'deal_audit', auditId), sanitizeForFirestore({
      deal_id: id,
      user_id: userId,
      deal_number: saved.deal_number,
      deal_title: saved.title,
      action: (['pending_finance', 'pending_technical'].includes(deal.status ?? '') ? 'submitted' : 'created') as any,
      to_status: saved.status,
      created_at: new Date().toISOString(),
      user: creatorUser,
    }))

    // Write notifications
    if (isApprovedResubmit && (saved.status === 'pending_technical' || saved.status === 'pending_finance')) {
      // Approved deal was revised — send version-aware notifications
      const versionLabel = `v${versionNumber}`
      const repName = creatorUser?.full_name ?? 'Sales Rep'
      const isTech = saved.status === 'pending_technical'
      const targetRole = isTech ? 'technical' : 'finance'
      const reviewerLabel = isTech ? 'Technical Review' : 'Finance Review'
      const actionUrl = `${window.location.origin}/#/deals/${id}`
      try {
        const reviewers = await fetchUsersByRole(targetRole)
        for (const reviewer of reviewers) {
          const notifId = `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`
          const revisionTitle = `Revised Deal Re-submitted for ${reviewerLabel} 🔄`
          const revisionMsg = `${saved.deal_number} (${versionLabel}) — "${saved.title}" is a revised version of a previously approved deal and requires fresh ${reviewerLabel}.`
          await setDoc(doc(db, 'notifications', notifId), sanitizeForFirestore({
            user_id: reviewer.id,
            deal_id: id,
            title: revisionTitle,
            message: revisionMsg,
            type: 'approval',
            is_read: false,
            created_at: new Date().toISOString(),
          }))
          if (reviewer.email) {
            sendWorkflowEmail({
              to_email: reviewer.email,
              recipient_name: reviewer.full_name || `${reviewerLabel} Team Member`,
              subject: revisionTitle,
              message: revisionMsg,
              deal_number: saved.deal_number,
              deal_title: saved.title,
              action_url: actionUrl,
            }).catch(err => console.error('Failed to send revision review email:', err))
          }
        }
        // Notify admin
        const adminUsers = await fetchUsersByRole('admin')
        for (const admin of adminUsers) {
          const notifId = `notif-admin-${Date.now()}-${Math.floor(Math.random() * 10000)}`
          await setDoc(doc(db, 'notifications', notifId), sanitizeForFirestore({
            user_id: admin.id,
            deal_id: id,
            title: `Approved Deal Revised — ${saved.deal_number}`,
            message: `${saved.deal_number} (${versionLabel}) — "${saved.title}" was edited by ${repName} and re-entered the approval pipeline. Previous approved version saved as reference.`,
            type: 'status_update',
            is_read: false,
            created_at: new Date().toISOString(),
          }))
        }
        // Notify sales rep
        const salesRepNotifId = `notif-rep-${Date.now()}-${Math.floor(Math.random() * 10000)}`
        await setDoc(doc(db, 'notifications', salesRepNotifId), sanitizeForFirestore({
          user_id: saved.created_by || userId,
          deal_id: id,
          title: `Deal Revised & Re-submitted 📋`,
          message: `Your revised deal ${saved.deal_number} (${versionLabel}) — "${saved.title}" has been re-submitted for approval. The previous approved version is saved as a reference snapshot.`,
          type: 'status_update',
          is_read: false,
          created_at: new Date().toISOString(),
        }))
        // Write audit entry
        const auditId = `audit-${Date.now()}`
        await setDoc(doc(db, 'deal_audit', auditId), sanitizeForFirestore({
          deal_id: id,
          user_id: userId,
          deal_number: saved.deal_number,
          deal_title: saved.title,
          action: 'resubmitted' as any,
          to_status: saved.status,
          comment: `Revised deal (${versionLabel}) re-submitted for approval. Previous approved version saved as snapshot.`,
          created_at: new Date().toISOString(),
          user: creatorUser,
        }))
      } catch (err) {
        console.error('Failed to write revision resubmit notifications:', err)
      }
    } else if (saved.status === 'pending_technical' || saved.status === 'pending_finance') {
      const isTech = saved.status === 'pending_technical'
      const targetRole = isTech ? 'technical' : 'finance'
      const reviewerLabel = isTech ? 'Technical Review' : 'Finance Review'
      if (useAuthStore.getState().isDemo) {
        const notifId = `notif-${Date.now()}`
        await setDoc(doc(db, 'notifications', notifId), {
          user_id: isTech ? 'demo-technical' : 'demo-finance',
          deal_id: id,
          title: 'New deal awaiting review',
          message: `${saved.deal_number} — ${saved.title} has been submitted by ${creatorUser?.full_name ?? 'Sales Rep'} and is awaiting ${reviewerLabel}.`,
          type: 'approval',
          is_read: false,
          created_at: new Date().toISOString(),
        })
      } else {
        try {
          const reviewers = await fetchUsersByRole(targetRole)
          const actionUrl = `${window.location.origin}/#/deals/${id}`
          for (const reviewer of reviewers) {
            const notifId = `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`
            await setDoc(doc(db, 'notifications', notifId), sanitizeForFirestore({
              user_id: reviewer.id,
              deal_id: id,
              title: 'New deal awaiting review',
              message: `${saved.deal_number} — ${saved.title} has been submitted by ${creatorUser?.full_name ?? 'Sales Rep'} and is awaiting ${reviewerLabel}.`,
              type: 'approval',
              is_read: false,
              created_at: new Date().toISOString(),
            }))

            if (reviewer.email) {
              sendWorkflowEmail({
                to_email: reviewer.email,
                recipient_name: reviewer.full_name || `${reviewerLabel} Team Member`,
                subject: 'New deal awaiting review',
                message: `${saved.deal_number} — ${saved.title} has been submitted by ${creatorUser?.full_name ?? 'Sales Rep'} and is awaiting ${reviewerLabel}.`,
                deal_number: saved.deal_number,
                deal_title: saved.title,
                action_url: actionUrl,
              }).catch(err => console.error('Failed to send submit email:', err))
            }
          }
        } catch (err) {
          console.error('Failed to write submit notifications:', err)
        }
      }
    }

    await checkAndNotifyBelowFloorMargin(saved).catch(err => console.error('Below margin check error:', err))

    return saved
  } catch (error) {
    console.error('Firebase save failed, falling back to mock storage:', error)
    if (saved.is_quote_only) {
      addMockQuote(saved)
    } else {
      addMockDeal(saved)
    }
    appendMockAudit({
      deal_id: id,
      user_id: userId,
      action: (['pending_finance', 'pending_technical'].includes(deal.status ?? '') ? 'submitted' : 'created') as any,
      to_status: saved.status,
      user: undefined,
    })
    if (saved.status === 'pending_technical') {
      appendMockNotification({
        user_id: 'demo-technical',
        deal_id: id,
        title: 'New deal awaiting review',
        message: `${saved.deal_number} — ${saved.title} has been submitted and is awaiting Technical Review.`,
        type: 'approval',
      })
    } else if (saved.status === 'pending_finance') {
      appendMockNotification({
        user_id: 'demo-finance',
        deal_id: id,
        title: 'New deal awaiting review',
        message: `${saved.deal_number} — ${saved.title} has been submitted and is awaiting Finance Review.`,
        type: 'approval',
      })
    }
    return saved
  }
}

export async function submitDealForApproval(dealId: string, userId: string, comment?: string): Promise<Deal> {
  const deal = await fetchDealById(dealId)
  if (!deal) throw new Error('Deal or Quote not found')

  const resolvedId = deal.id
  const isResubmission = deal.status === 'changes_requested' || Boolean(deal.previous_versions && deal.previous_versions.length > 0)

  // Quotations bypass Tech/Finance review and route to Sales Head if below floor margin or resubmitted, or auto-approve if >= floor margin
  if (deal.is_quote_only) {
    const settings = fetchSettings()
    const floorMarginDecimal = settings?.floor_margin_pct ?? 0.06
    const quoteMarginDecimal = (deal.gross_margin_pct ?? 0) / 100
    const isBelowFloorMargin = quoteMarginDecimal < floorMarginDecimal

    if (isBelowFloorMargin || isResubmission) {
      const actionComment = comment || (isResubmission ? 'Resubmitted edited quotation for Sales Head approval' : 'Submitted for Sales Head approval (below floor margin)')
      return transitionDeal(resolvedId, 'pending_sales_head', 'submitted', userId, actionComment)
    } else {
      const actionComment = comment || 'Auto-approved (above floor margin)'
      return transitionDeal(resolvedId, 'approved', 'approved', userId, actionComment)
    }
  }

  // Full Deal workflow: Technical Review -> Finance Review -> Sales Head Review -> Approved
  const requiresTech = deal.requires_technical !== false
  const toStatus = requiresTech ? 'pending_technical' : 'pending_finance'
  const actionComment = isResubmission ? (comment || 'Resubmitted after revision') : (comment || 'Submitted for Technical Review')
  return transitionDeal(resolvedId, toStatus, 'submitted', userId, actionComment)
}

export async function approveDeal(
  dealId: string,
  userId: string,
  currentStatus: DealStatus,
  requiresTechnical: boolean,
  comment?: string,
  assignedOpsOwner?: string
): Promise<Deal> {
  const deal = await fetchDealById(dealId)
  const resolvedId = deal ? deal.id : dealId
  const next = getNextStatus(currentStatus, requiresTechnical)
  if (!next) throw new Error('Cannot approve from current status')
  return transitionDeal(resolvedId, next, 'approved', userId, comment || 'Approved', assignedOpsOwner)
}

export async function rejectDeal(
  dealId: string,
  userId: string,
  comment: string
): Promise<Deal> {
  const deal = await fetchDealById(dealId)
  const resolvedId = deal ? deal.id : dealId
  return transitionDeal(resolvedId, 'rejected', 'rejected', userId, comment)
}

export async function requestChanges(
  dealId: string,
  userId: string,
  comment: string
): Promise<Deal> {
  const deal = await fetchDealById(dealId)
  const resolvedId = deal ? deal.id : dealId
  return transitionDeal(resolvedId, 'changes_requested', 'changes_requested', userId, comment)
}

export async function directApproveDeal(
  dealId: string,
  userId: string,
  comment?: string,
  assignedOpsOwner?: string
): Promise<Deal> {
  const deal = await fetchDealById(dealId)
  const resolvedId = deal ? deal.id : dealId
  return transitionDeal(resolvedId, 'approved', 'approved', userId, comment || 'Direct Admin Approval', assignedOpsOwner)
}

async function fetchUsersByRole(role: UserRole): Promise<User[]> {
  // Try Firestore first
  try {
    const usersCol = collection(db, 'users')
    const q = query(usersCol, where('role', '==', role))
    const snap = await getDocs(q)
    const list: User[] = []
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as User)
    })
    if (list.length > 0) return list
  } catch (err) {
    console.error(`Failed to fetch users by role ${role} from Firestore:`, err)
  }

  // If the current logged-in user has the requested role, use them as the recipient
  // This ensures live/real accounts receive notifications using their actual Firebase UID
  const currentUser = useAuthStore.getState().user
  if (currentUser && currentUser.role === role && currentUser.id && currentUser.email) {
    return [currentUser]
  }

  // Secondary fallback: use known demo/default profiles so email delivery doesn't fail silently
  const fallbackUsers: Record<UserRole, User[]> = {
    technical: [{
      id: 'demo-technical',
      email: 'vikram.patel@pricedesk.in',
      full_name: 'Vikram Patel (Technical)',
      role: 'technical',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }],
    finance: [{
      id: 'demo-finance',
      email: 'priya.sharma@pricedesk.in',
      full_name: 'Priya Sharma (Finance)',
      role: 'finance',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }],
    sales_head: [{
      id: 'demo-head',
      email: 'ananya.iyer@pricedesk.in',
      full_name: 'Ananya Iyer (Sales Head)',
      role: 'sales_head',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }],
    admin: [{
      id: 'demo-admin',
      email: 'admin@pricedesk.in',
      full_name: 'Rahul Kapoor (Admin)',
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }],
    sales_rep: [{
      id: 'demo-sales',
      email: 'arjun.mehta@pricedesk.in',
      full_name: 'Arjun Mehta (Sales Rep)',
      role: 'sales_rep',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }],
    ops: [{
      id: 'demo-ops-chetan',
      email: 'chetan@pricedesk.in',
      full_name: 'Chetan',
      role: 'ops',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }],
  }

  return fallbackUsers[role] || []
}

async function fetchUserById(userId: string): Promise<User | null> {
  const userSnap = await getDoc(doc(db, 'users', userId))
  if (!userSnap.exists()) return null
  return { id: userId, ...userSnap.data() } as User
}

async function checkAndNotifyBelowFloorMargin(saved: Deal) {
  if (!saved.is_quote_only || saved.status === 'draft') return

  const settings = fetchSettings()
  const floorMarginDecimal = settings?.floor_margin_pct ?? 0.06
  const quoteMarginDecimal = (saved.gross_margin_pct ?? 0) / 100
  const isBelowFloorMargin = quoteMarginDecimal < floorMarginDecimal

  if (isBelowFloorMargin) {
    const creatorUser = saved.creator || (saved.created_by ? Object.values(DEMO_USERS).find((u) => u.id === saved.created_by) : undefined)
    const creatorName = creatorUser?.full_name || 'Arjun Mehta (Sales Rep)'
    const floorPctStr = (floorMarginDecimal * 100).toFixed(1)
    const quoteMarginStr = (saved.gross_margin_pct ?? 0).toFixed(2)
    const quoteNum = saved.quote_number || saved.deal_number
    const alertSubject = `⚠️ Below Floor Margin Quotation Submitted for Approval: ${quoteNum}`
    const alertMessage = `Quotation ${quoteNum} ("${saved.title}") submitted by Sales Rep ${creatorName} for ${saved.customer_name || 'Customer'} has a gross margin of ${quoteMarginStr}%, which is below the required floor margin of ${floorPctStr}%. Sales Head approval is required.`

    const isDemoMode = useAuthStore.getState().isDemo
    if (isDemoMode) {
      appendMockNotification({
        user_id: 'demo-head',
        deal_id: saved.id,
        title: '⚠️ Below Floor Margin Quotation Submitted',
        message: `${quoteNum} — "${saved.title}" was submitted by ${creatorName} with ${quoteMarginStr}% margin (below floor margin of ${floorPctStr}%).`,
        type: 'approval',
      })
    } else {
      try {
        const salesHeadUsers = await fetchUsersByRole('sales_head')
        for (const head of salesHeadUsers) {
          const notifId = `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`
          await setDoc(doc(db, 'notifications', notifId), {
            user_id: head.id,
            deal_id: saved.id,
            title: '⚠️ Below Floor Margin Quotation Submitted',
            message: `${quoteNum} — "${saved.title}" was submitted by ${creatorName} with ${quoteMarginStr}% margin (below floor margin of ${floorPctStr}%).`,
            type: 'approval',
            is_read: false,
            created_at: new Date().toISOString(),
          })
        }
      } catch (err) {
        console.error('Failed to write below-floor-margin notification to Firestore:', err)
      }
    }

    // Send email to Sales Head with creator name
    await sendWorkflowEmailAlert(
      saved.id,
      quoteNum,
      saved.title,
      'sales_head',
      alertSubject,
      alertMessage
    ).catch(err => console.error('Failed to send below-floor-margin email to Sales Head:', err))
  }
}

async function sendWorkflowEmailAlert(
  dealId: string,
  dealNumber: string,
  dealTitle: string,
  targetRoleOrUserId: string,
  subject: string,
  message: string
) {
  const isQuote = dealNumber.startsWith('QT-')
  const actionUrl = `${window.location.origin}/#/${isQuote ? 'quotes' : 'deals'}/${dealId}`
  const isRole = ['finance', 'technical', 'sales_head', 'sales_rep', 'admin'].includes(targetRoleOrUserId)
  const isDirectEmail = targetRoleOrUserId.includes('@')

  if (useAuthStore.getState().isDemo) {
    console.log(`[DEMO MODE] Would send email to: ${targetRoleOrUserId} | Subject: ${subject}`)

    let recipientEmail = isDirectEmail ? targetRoleOrUserId : ''
    let recipientName = 'Team Member'
    if (targetRoleOrUserId === 'sales_head') {
      recipientEmail = DEMO_USERS['ananya.iyer@pricedesk.in']?.email || 'ananya.iyer@pricedesk.in'
      recipientName = 'Ananya Iyer (Sales Head)'
    } else if (targetRoleOrUserId === 'finance') {
      recipientEmail = DEMO_USERS['priya.sharma@pricedesk.in']?.email || 'priya.sharma@pricedesk.in'
      recipientName = 'Priya Sharma (Finance)'
    } else if (targetRoleOrUserId === 'technical') {
      recipientEmail = DEMO_USERS['vikram.patel@pricedesk.in']?.email || 'vikram.patel@pricedesk.in'
      recipientName = 'Vikram Patel (Technical)'
    } else if (targetRoleOrUserId === 'admin') {
      recipientEmail = DEMO_USERS['admin@pricedesk.in']?.email || 'admin@pricedesk.in'
      recipientName = 'System Admin'
    } else {
      const foundDemoUser = Object.values(DEMO_USERS).find((u) => u.id === targetRoleOrUserId || u.email === targetRoleOrUserId)
      if (foundDemoUser) {
        recipientEmail = foundDemoUser.email
        recipientName = foundDemoUser.full_name
      }
    }

    if (recipientEmail) {
      sendWorkflowEmail({
        to_email: recipientEmail,
        recipient_name: recipientName,
        subject,
        message,
        deal_number: dealNumber,
        deal_title: dealTitle,
        action_url: actionUrl,
      }).catch((err) => console.error('Demo mode email send attempt:', err))
    }
    return
  }

  try {
    if (isDirectEmail) {
      await sendWorkflowEmail({
        to_email: targetRoleOrUserId,
        recipient_name: 'Sales Rep',
        subject,
        message,
        deal_number: dealNumber,
        deal_title: dealTitle,
        action_url: actionUrl,
      })
      return
    }

    if (isRole) {
      const reviewers = await fetchUsersByRole(targetRoleOrUserId as UserRole)
      for (const reviewer of reviewers) {
        if (reviewer.email) {
          await sendWorkflowEmail({
            to_email: reviewer.email,
            recipient_name: reviewer.full_name || 'Reviewer',
            subject,
            message,
            deal_number: dealNumber,
            deal_title: dealTitle,
            action_url: actionUrl,
          })
        }
      }
    } else {
      const targetUser = await fetchUserById(targetRoleOrUserId)
      if (targetUser && targetUser.email) {
        await sendWorkflowEmail({
          to_email: targetUser.email,
          recipient_name: targetUser.full_name || 'Team Member',
          subject,
          message,
          deal_number: dealNumber,
          deal_title: dealTitle,
          action_url: actionUrl,
        })
      } else {
        console.warn(`Unable to send workflow email: user not found for id ${targetRoleOrUserId}`)
      }
    }
  } catch (err) {
    console.error('Failed to trigger workflow email:', err)
  }
}

async function transitionDeal(
  dealId: string,
  toStatus: DealStatus,
  action: string,
  userId: string,
  comment: string,
  assignedOpsOwner?: string
): Promise<Deal> {
  if (useAuthStore.getState().isDemo) {
    let isQuote = false
    let deal = MOCK_DEALS.find((d) => d.id === dealId)
    if (!deal) {
      deal = MOCK_QUOTES.find((q) => q.id === dealId)
      if (deal) isQuote = true
    } else {
      isQuote = Boolean(deal.is_quote_only)
    }

    if (!deal) throw new Error('Deal not found')

    const actorUser = Object.values(DEMO_USERS).find((u) => u.id === userId)
    const fromStatus = deal.status
    const updated = {
      ...deal,
      status: toStatus,
      updated_at: new Date().toISOString(),
      ...(assignedOpsOwner ? { assigned_ops_owner: assignedOpsOwner } : {}),
      ...(toStatus === 'approved' ? {
        approved_at: new Date().toISOString(),
        approved_by: comment?.includes('Auto-approved') ? 'System (Auto-Approved)' : (actorUser?.full_name ?? 'Sales Head')
      } : {}),
      ...(action === 'rejected' || action === 'changes_requested'
        ? { rejection_reason: comment }
        : {}),
    }

    if (isQuote) {
      updateMockQuote(dealId, updated)
      if (toStatus === 'approved' && (updated as any).parent_deal_id) {
        const parent = MOCK_DEALS.find((d) => d.id === (updated as any).parent_deal_id)
        if (parent) {
          const fromParentStatus = parent.status
          parent.status = 'approved'
          parent.updated_at = new Date().toISOString()
          parent.approved_at = new Date().toISOString()
          parent.approved_by = comment?.includes('Auto-approved') ? 'System (Auto-Approved)' : (actorUser?.full_name ?? 'Sales Head')
          updateMockDeal(parent.id, parent)
          appendMockAudit({
            deal_id: parent.id,
            user_id: userId,
            action: 'approved',
            from_status: fromParentStatus,
            to_status: 'approved',
            comment: `Automatically marked Approved via approval of Quote ${updated.quote_number}`,
            user: actorUser,
          })
        }
      }
    } else {
      updateMockDeal(dealId, updated)
    }
    appendMockAudit({
      deal_id: dealId,
      user_id: userId,
      action: action as AuditAction,
      from_status: fromStatus,
      to_status: toStatus,
      comment: comment || undefined,
      user: actorUser,
    })

    // Generate notifications dynamically based on target status
    const reviewerName = actorUser?.full_name ?? 'Reviewer'
    const salesRepId = updated.created_by || 'demo-sales'

    if (toStatus === 'pending_technical') {
      appendMockNotification({
        user_id: 'demo-technical',
        deal_id: dealId,
        title: 'Technical review required',
        message: `${updated.deal_number} — ${updated.title} requires technical feasibility sign-off.`,
        type: 'approval',
      })
      await sendWorkflowEmailAlert(dealId, updated.deal_number, updated.title, 'technical', 'Technical review required', `${updated.deal_number} — ${updated.title} requires technical feasibility sign-off.`)
    } else if (toStatus === 'pending_finance') {
      appendMockNotification({
        user_id: 'demo-finance',
        deal_id: dealId,
        title: 'New deal awaiting review',
        message: `${updated.deal_number} — ${updated.title} has passed preliminary steps and is awaiting Finance Review.`,
        type: 'approval',
      })
      await sendWorkflowEmailAlert(dealId, updated.deal_number, updated.title, 'finance', 'New deal awaiting review', `${updated.deal_number} — ${updated.title} has passed preliminary steps and is awaiting Finance Review.`)
      if (fromStatus === 'pending_technical') {
        appendMockNotification({
          user_id: salesRepId,
          deal_id: dealId,
          title: 'Deal passed Technical Review',
          message: `Your deal ${updated.deal_number} — ${updated.title} has passed Technical Review and is routed to Finance Review.`,
          type: 'status_update',
        })
        await sendWorkflowEmailAlert(dealId, updated.deal_number, updated.title, salesRepId, 'Deal passed Technical Review', `Your deal ${updated.deal_number} — ${updated.title} has passed Technical Review and is routed to Finance Review.`)
      }
    } else if (toStatus === 'pending_sales_head') {
      const isQuote = updated.is_quote_only
      const isVersioned = (updated.version_number && updated.version_number > 1) || (updated.previous_versions && updated.previous_versions.length > 0) || (updated.quote_number && updated.quote_number.includes('-v'))
      const docNum = updated.quote_number || updated.deal_number
      
      const headTitle = isQuote 
        ? (isVersioned ? `🔄 Resubmitted Quotation Awaiting Approval: ${docNum}` : `⚠️ Below Floor Margin Quotation Submitted`)
        : 'Final approval pending'
      const headMsg = isQuote
        ? (isVersioned
            ? `Edited Quotation ${docNum} — "${updated.title}" was resubmitted by Sales Rep and requires Sales Head approval (gross margin below floor margin).`
            : `Quotation ${docNum} — "${updated.title}" was submitted and requires Sales Head approval (gross margin below floor margin).`)
        : `${docNum} — ${updated.title} is ready for Sales Head final gate review.`
      const repTitle = isQuote 
        ? (isVersioned ? `Quotation ${docNum} Resubmitted for Approval 🔄` : 'Quotation Submitted for Approval 🚀')
        : 'Deal routed to Sales Head'
      const repMsg = isQuote
        ? (isVersioned
            ? `Your edited quotation ${docNum} — "${updated.title}" has been resubmitted and is awaiting Sales Head approval.`
            : `Your quotation ${docNum} — "${updated.title}" has been submitted and is awaiting Sales Head approval.`)
        : `Your deal ${docNum} — ${updated.title} has passed preliminary reviews and is awaiting Sales Head final sign-off.`

      appendMockNotification({
        user_id: 'demo-head',
        deal_id: dealId,
        title: headTitle,
        message: headMsg,
        type: 'approval',
      })
      appendMockNotification({
        user_id: salesRepId,
        deal_id: dealId,
        title: repTitle,
        message: repMsg,
        type: 'status_update',
      })
      await sendWorkflowEmailAlert(dealId, docNum, updated.title, 'sales_head', headTitle, headMsg)
      await sendWorkflowEmailAlert(dealId, docNum, updated.title, salesRepId, repTitle, repMsg)
    } else if (toStatus === 'approved') {
      const isQuote = updated.is_quote_only
      const isVersioned = (updated.version_number && updated.version_number > 1) || (updated.previous_versions && updated.previous_versions.length > 0) || (updated.quote_number && updated.quote_number.includes('-v'))
      const docLabel = isQuote ? (isVersioned ? 'Edited Quotation' : 'Quotation') : 'Deal'
      const docNum = updated.quote_number || updated.deal_number
      appendMockNotification({
        user_id: salesRepId,
        deal_id: dealId,
        title: `${docLabel} Approved 🎉`,
        message: `Congratulations! Your ${docLabel.toLowerCase()} ${docNum} — "${updated.title}" has been approved.${comment ? ` Note: "${comment}"` : ''}`,
        type: 'status_update',
      })
      appendMockNotification({
        user_id: 'demo-finance',
        deal_id: dealId,
        title: `${docLabel} Approved`,
        message: `${docNum} — "${updated.title}" has been approved by Sales Head ${reviewerName}.`,
        type: 'status_update',
      })
      appendMockNotification({
        user_id: 'demo-technical',
        deal_id: dealId,
        title: `${docLabel} Approved`,
        message: `${docNum} — "${updated.title}" has been approved by Sales Head ${reviewerName}.`,
        type: 'status_update',
      })
      if (!isQuote) {
        await sendWorkflowEmailAlert(
          dealId,
          docNum,
          updated.title,
          salesRepId,
          `${docLabel} ${docNum} Approved by Sales Head ${reviewerName} 🎉`,
          `Congratulations! Your ${docLabel.toLowerCase()} ${docNum} ("${updated.title}") has been approved by Sales Head ${reviewerName}.${comment ? ` Note: "${comment}"` : ''}`
        )
      }
    } else if (toStatus === 'rejected') {
      const isQuote = updated.is_quote_only
      const docLabel = isQuote ? 'Quotation' : 'Deal'
      const docNum = updated.quote_number || updated.deal_number
      appendMockNotification({
        user_id: salesRepId,
        deal_id: dealId,
        title: `${docLabel} Rejected ❌`,
        message: `Your ${docLabel.toLowerCase()} ${docNum} — "${updated.title}" has been rejected by Sales Head ${reviewerName}. Feedback: "${comment || 'No feedback provided'}"`,
        type: 'rejection',
      })
      await sendWorkflowEmailAlert(
        dealId,
        docNum,
        updated.title,
        salesRepId,
        `${docLabel} ${docNum} Rejected by Sales Head ${reviewerName} ❌`,
        `Your ${docLabel.toLowerCase()} ${docNum} ("${updated.title}") has been rejected by Sales Head ${reviewerName}. Feedback: "${comment || 'No feedback provided'}"`
      )
    } else if (toStatus === 'changes_requested') {
      const isQuote = updated.is_quote_only
      const docLabel = isQuote ? 'Quotation' : 'Deal'
      const docNum = updated.quote_number || updated.deal_number
      appendMockNotification({
        user_id: salesRepId,
        deal_id: dealId,
        title: `Revision Requested 📝`,
        message: `Your ${docLabel.toLowerCase()} ${docNum} — "${updated.title}" requires modifications as requested by ${reviewerName}. Feedback: "${comment || 'No feedback provided'}"`,
        type: 'revision',
      })
      await sendWorkflowEmailAlert(
        dealId,
        docNum,
        updated.title,
        salesRepId,
        `Revision Requested for ${docLabel} ${docNum} by ${reviewerName} 📝`,
        `Your ${docLabel.toLowerCase()} ${docNum} ("${updated.title}") requires modifications. Feedback: "${comment || 'No feedback provided'}"`
      )
    }

    // Always notify System Admin of every transition
    appendMockNotification({
      user_id: 'demo-admin',
      deal_id: dealId,
      title: `Deal ${updated.deal_number} Updated`,
      message: `${updated.deal_number} — "${updated.title}" status is now ${updated.status.replace(/_/g, ' ').toUpperCase()} (updated by ${reviewerName}).`,
      type: 'status_update',
    })

    return updated
  }

  // Live Firebase transition
  let dealRef = doc(db, 'deals', dealId)
  let dealSnap = await getDoc(dealRef)
  let isQuoteCollection = false

  let deal: Deal | null = null

  if (dealSnap.exists()) {
    deal = { id: dealId, ...dealSnap.data() } as Deal
  } else {
    dealRef = doc(db, 'quotes', dealId)
    dealSnap = await getDoc(dealRef)
    if (dealSnap.exists()) {
      isQuoteCollection = true
      deal = { id: dealId, ...dealSnap.data() } as Deal
    }
  }

  if (!deal) {
    const resolved = await fetchDealById(dealId)
    if (resolved) {
      isQuoteCollection = Boolean(resolved.is_quote_only)
      dealRef = doc(db, isQuoteCollection ? 'quotes' : 'deals', resolved.id)
      deal = resolved
    }
  }

  if (!deal) throw new Error('Deal or Quote not found')
  const fromStatus = deal.status

  const userRef = doc(db, 'users', userId)
  const userSnap = await getDoc(userRef)
  const actorUser = userSnap.exists() ? { id: userId, ...userSnap.data() } as User : undefined

  const updated: Deal = {
    ...deal,
    status: toStatus,
    updated_at: new Date().toISOString(),
    ...(assignedOpsOwner ? { assigned_ops_owner: assignedOpsOwner } : {}),
    ...(toStatus === 'approved' ? {
      approved_at: new Date().toISOString(),
      approved_by: comment?.includes('Auto-approved') ? 'System (Auto-Approved)' : (actorUser?.full_name ?? 'Sales Head')
    } : {}),
    ...(action === 'rejected' || action === 'changes_requested'
      ? { rejection_reason: comment }
      : {}),
  }

  await setDoc(dealRef, sanitizeForFirestore(updated))

  // Sync parent Deal to Approved status when its child Quote is approved
  if (isQuoteCollection && toStatus === 'approved' && updated.parent_deal_id) {
    const parentRef = doc(db, 'deals', updated.parent_deal_id)
    const parentSnap = await getDoc(parentRef)
    if (parentSnap.exists()) {
      const parentData = parentSnap.data() as Deal
      const fromParentStatus = parentData.status
      const updatedParent = {
        ...parentData,
        status: 'approved' as DealStatus,
        updated_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        approved_by: comment?.includes('Auto-approved') ? 'System (Auto-Approved)' : (actorUser?.full_name ?? 'Sales Head')
      }
      await setDoc(parentRef, sanitizeForFirestore(updatedParent))
      
      const parentAuditId = `audit-${Date.now()}-parent`
      await setDoc(doc(db, 'deal_audit', parentAuditId), sanitizeForFirestore({
        deal_id: parentData.id,
        user_id: userId,
        deal_number: parentData.deal_number,
        deal_title: parentData.title,
        action: 'approved' as AuditAction,
        from_status: fromParentStatus,
        to_status: 'approved' as DealStatus,
        comment: `Automatically marked Approved via approval of Quote ${updated.quote_number || updated.deal_number}`,
        created_at: new Date().toISOString(),
        user: actorUser,
      }))
    }
  }

  // Write audit entry
  const auditId = `audit-${Date.now()}`
  await setDoc(doc(db, 'deal_audit', auditId), sanitizeForFirestore({
    deal_id: dealId,
    user_id: userId,
    deal_number: deal.deal_number,
    deal_title: deal.title,
    action: action as AuditAction,
    from_status: fromStatus,
    to_status: toStatus,
    comment: comment || undefined,
    created_at: new Date().toISOString(),
    user: actorUser,
  }))

  // Generate Firestore notifications dynamically
  const reviewerName = actorUser?.full_name ?? 'Reviewer'
  const salesRepId = updated.created_by || deal.created_by || ''
  const salesRepEmail = updated.creator?.email || deal.creator?.email
  const salesRepTarget = salesRepId || salesRepEmail || ''

  const triggerNotif = async (targetRoleOrUserId: string, title: string, message: string, type: 'approval' | 'status_update' | 'rejection' | 'revision') => {
    const isDemoMode = useAuthStore.getState().isDemo

    // In demo mode, use the targetRoleOrUserId directly (like demo-finance, etc.)
    if (isDemoMode) {
      const demoIdMap: Record<string, string> = {
        finance: 'demo-finance',
        technical: 'demo-technical',
        sales_head: 'demo-head',
        admin: 'demo-admin',
      }
      const mappedId = demoIdMap[targetRoleOrUserId] || targetRoleOrUserId
      const notifId = `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      await setDoc(doc(db, 'notifications', notifId), {
        user_id: mappedId,
        deal_id: dealId,
        title,
        message,
        type,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      return
    }

    // In live Firestore mode, write notifications for roles dynamically
    const rolesList = ['finance', 'technical', 'sales_head', 'admin']
    const isRole = rolesList.includes(targetRoleOrUserId)

    try {
      if (isRole) {
        const users = await fetchUsersByRole(targetRoleOrUserId as UserRole)
        for (const u of users) {
          const notifId = `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`
          await setDoc(doc(db, 'notifications', notifId), sanitizeForFirestore({
            user_id: u.id,
            deal_id: dealId,
            title,
            message,
            type,
            is_read: false,
            created_at: new Date().toISOString(),
          }))
        }
      } else {
        const notifId = `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`
        await setDoc(doc(db, 'notifications', notifId), sanitizeForFirestore({
          user_id: targetRoleOrUserId,
          deal_id: dealId,
          title,
          message,
          type,
          is_read: false,
          created_at: new Date().toISOString(),
        }))
      }
    } catch (err) {
      console.error('Failed to trigger Firestore notifications:', err)
    }
  }

  if (toStatus === 'pending_technical') {
    await triggerNotif('technical', 'Technical review required', `${updated.deal_number} — ${updated.title} requires technical feasibility sign-off.`, 'approval')
    await sendWorkflowEmailAlert(dealId, updated.deal_number, updated.title, 'technical', 'Technical review required', `${updated.deal_number} — ${updated.title} requires technical feasibility sign-off.`)
  } else if (toStatus === 'pending_finance') {
    await triggerNotif('finance', 'New deal awaiting review', `${updated.deal_number} — ${updated.title} has passed preliminary steps and is awaiting Finance Review.`, 'approval')
    await sendWorkflowEmailAlert(dealId, updated.deal_number, updated.title, 'finance', 'New deal awaiting review', `${updated.deal_number} — ${updated.title} has passed preliminary steps and is awaiting Finance Review.`)
    if (fromStatus === 'pending_technical') {
      await triggerNotif(salesRepId, 'Deal passed Technical Review', `Your deal ${updated.deal_number} — ${updated.title} has passed Technical Review and is routed to Finance Review.`, 'status_update')
      await sendWorkflowEmailAlert(dealId, updated.deal_number, updated.title, salesRepTarget, 'Deal passed Technical Review', `Your deal ${updated.deal_number} — ${updated.title} has passed Technical Review and is routed to Finance Review.`)
    }
  } else if (toStatus === 'pending_sales_head') {
    const isQuote = updated.is_quote_only
    const isVersioned = (updated.version_number && updated.version_number > 1) || (updated.previous_versions && updated.previous_versions.length > 0) || (updated.quote_number && updated.quote_number.includes('-v'))
    const docNum = updated.quote_number || updated.deal_number
    
    const headTitle = isQuote 
      ? (isVersioned ? `🔄 Resubmitted Quotation Awaiting Approval: ${docNum}` : `⚠️ Below Floor Margin Quotation Submitted`)
      : 'Final approval pending'
    const headMsg = isQuote
      ? (isVersioned
          ? `Edited Quotation ${docNum} — "${updated.title}" was resubmitted by Sales Rep and requires Sales Head approval (gross margin below floor margin).`
          : `Quotation ${docNum} — "${updated.title}" was submitted and requires Sales Head approval (gross margin below floor margin).`)
      : `${docNum} — ${updated.title} is ready for Sales Head final gate review.`
    const repTitle = isQuote 
      ? (isVersioned ? `Quotation ${docNum} Resubmitted for Approval 🔄` : 'Quotation Submitted for Approval 🚀')
      : 'Deal routed to Sales Head'
    const repMsg = isQuote
      ? (isVersioned
          ? `Your edited quotation ${docNum} — "${updated.title}" has been resubmitted and is awaiting Sales Head approval.`
          : `Your quotation ${docNum} — "${updated.title}" has been submitted and is awaiting Sales Head approval.`)
      : `Your deal ${docNum} — ${updated.title} has passed preliminary reviews and is awaiting Sales Head final sign-off.`

    await triggerNotif('sales_head', headTitle, headMsg, 'approval')
    await triggerNotif(salesRepId, repTitle, repMsg, 'status_update')

    await sendWorkflowEmailAlert(dealId, docNum, updated.title, 'sales_head', headTitle, headMsg)
    await sendWorkflowEmailAlert(dealId, docNum, updated.title, salesRepTarget, repTitle, repMsg)
  } else if (toStatus === 'approved') {
    const isQuote = updated.is_quote_only
    const isVersioned = (updated.version_number && updated.version_number > 1) || (updated.previous_versions && updated.previous_versions.length > 0) || (updated.quote_number && updated.quote_number.includes('-v'))
    const docLabel = isQuote ? (isVersioned ? 'Edited Quotation' : 'Quotation') : 'Deal'
    const docNum = updated.quote_number || updated.deal_number
    await triggerNotif(salesRepId, `${docLabel} Approved 🎉`, `Congratulations! Your ${docLabel.toLowerCase()} ${docNum} — "${updated.title}" has been approved.${comment ? ` Note: "${comment}"` : ''}`, 'status_update')
    await triggerNotif('finance', `${docLabel} Approved`, `${docNum} — "${updated.title}" has been approved by Sales Head ${reviewerName}.`, 'status_update')
    await triggerNotif('technical', `${docLabel} Approved`, `${docNum} — "${updated.title}" has been approved by Sales Head ${reviewerName}.`, 'status_update')

    if (!isQuote) {
      await sendWorkflowEmailAlert(
        dealId,
        docNum,
        updated.title,
        salesRepTarget,
        `${docLabel} ${docNum} Approved by Sales Head ${reviewerName} 🎉`,
        `Congratulations! Your ${docLabel.toLowerCase()} ${docNum} ("${updated.title}") has been approved by Sales Head ${reviewerName}.${comment ? ` Note: "${comment}"` : ''}`
      )
    }
  } else if (toStatus === 'rejected') {
    const isQuote = updated.is_quote_only
    const docLabel = isQuote ? 'Quotation' : 'Deal'
    const docNum = updated.quote_number || updated.deal_number
    await triggerNotif(salesRepId, `${docLabel} Rejected ❌`, `Your ${docLabel.toLowerCase()} ${docNum} — "${updated.title}" has been rejected by Sales Head ${reviewerName}. Feedback: "${comment || 'No feedback provided'}"`, 'rejection')
    await sendWorkflowEmailAlert(
      dealId,
      docNum,
      updated.title,
      salesRepTarget,
      `${docLabel} ${docNum} Rejected by Sales Head ${reviewerName} ❌`,
      `Your ${docLabel.toLowerCase()} ${docNum} ("${updated.title}") has been rejected by Sales Head ${reviewerName}. Feedback: "${comment || 'No feedback provided'}"`
    )
  } else if (toStatus === 'changes_requested') {
    const isQuote = updated.is_quote_only
    const docLabel = isQuote ? 'Quotation' : 'Deal'
    const docNum = updated.quote_number || updated.deal_number
    await triggerNotif(salesRepId, `Revision Requested 📝`, `Your ${docLabel.toLowerCase()} ${docNum} — "${updated.title}" requires modifications as requested by ${reviewerName}. Feedback: "${comment || 'No feedback provided'}"`, 'revision')
    await sendWorkflowEmailAlert(
      dealId,
      docNum,
      updated.title,
      salesRepTarget,
      `Revision Requested for ${docLabel} ${docNum} by ${reviewerName} 📝`,
      `Your ${docLabel.toLowerCase()} ${docNum} ("${updated.title}") requires modifications. Feedback: "${comment || 'No feedback provided'}"`
    )
  }

  // Notify System Admin
  await triggerNotif('admin', `Deal ${updated.deal_number} Updated`, `${updated.deal_number} — "${updated.title}" status is now ${updated.status.replace(/_/g, ' ').toUpperCase()} (updated by ${reviewerName}).`, 'status_update')

  return updated
}
