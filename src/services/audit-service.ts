import type { AuditAction, DealAudit } from '@/types'
import { MOCK_AUDIT_LOG, appendMockAudit } from '@/lib/mock-data'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth-store'
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore'

export interface AuditFilters {
  search?: string
  action?: AuditAction | 'all'
  limit?: number
}

export async function fetchAuditLog(filters: AuditFilters = {}): Promise<DealAudit[]> {
  const queryLimit = filters.limit ?? 200

  if (useAuthStore.getState().isDemo) {
    let rows = [...MOCK_AUDIT_LOG]
    if (filters.action && filters.action !== 'all') {
      rows = rows.filter((r) => r.action === filters.action)
    }
    if (filters.search?.trim()) {
      const q = filters.search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.deal_number?.toLowerCase().includes(q) ||
          r.deal_title?.toLowerCase().includes(q) ||
          r.user?.full_name?.toLowerCase().includes(q) ||
          r.comment?.toLowerCase().includes(q)
      )
    }
    return rows
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, queryLimit)
  }

  const auditCol = collection(db, 'deal_audit')
  
  let q = query(auditCol, orderBy('created_at', 'desc'), limit(queryLimit))
  if (filters.action && filters.action !== 'all') {
    q = query(auditCol, where('action', '==', filters.action), orderBy('created_at', 'desc'), limit(queryLimit))
  }

  const snap = await getDocs(q)
  let list: DealAudit[] = []
  
  snap.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() } as DealAudit)
  })

  // Filter in memory for text searches (NoSQL Firestore text searches are best done client-side for simple cases)
  if (filters.search?.trim()) {
    const term = filters.search.toLowerCase()
    list = list.filter(
      (r) =>
        r.deal_number?.toLowerCase().includes(term) ||
        r.deal_title?.toLowerCase().includes(term) ||
        r.user?.full_name?.toLowerCase().includes(term) ||
        r.comment?.toLowerCase().includes(term)
    )
  }

  return list
}

export function exportAuditLogCsv(rows: DealAudit[]): void {
  const headers = [
    'Timestamp',
    'Deal Number',
    'Deal Title',
    'User',
    'Action',
    'From Status',
    'To Status',
    'Comment',
  ]
  const lines = rows.map((r) =>
    [
      r.created_at,
      r.deal_number ?? '',
      r.deal_title ?? '',
      r.user?.full_name ?? r.user_id,
      r.action,
      r.from_status ?? '',
      r.to_status ?? '',
      (r.comment ?? '').replace(/"/g, '""'),
    ]
      .map((v) => `"${v}"`)
      .join(',')
  )
  const csv = [headers.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pricedesk-audit-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export { appendMockAudit }
