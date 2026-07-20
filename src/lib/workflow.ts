import type { DealStatus, UserRole } from '@/types'

export function getNextStatus(
  current: DealStatus,
  requiresTechnical: boolean
): DealStatus | null {
  const flow: Record<DealStatus, DealStatus | null> = {
    draft: requiresTechnical ? 'pending_technical' : 'pending_finance',
    pending_technical: 'pending_finance',
    pending_finance: 'pending_sales_head',
    pending_sales_head: 'approved',
    approved: null,
    rejected: null,
    changes_requested: requiresTechnical ? 'pending_technical' : 'pending_finance',
  }
  return flow[current] ?? null
}

export function canUserActOnDeal(
  role: UserRole,
  status: DealStatus
): boolean {
  const permissions: Partial<Record<UserRole, DealStatus[]>> = {
    sales_rep: ['draft', 'changes_requested'],
    finance: ['pending_finance'],
    technical: ['pending_technical'],
    sales_head: ['pending_sales_head'],
    admin: [
      'draft',
      'pending_finance',
      'pending_technical',
      'pending_sales_head',
      'changes_requested',
    ],
  }
  return permissions[role]?.includes(status) ?? false
}

export function getStageIndex(status: DealStatus, requiresTechnical: boolean): number {
  const stages: DealStatus[] = requiresTechnical
    ? ['draft', 'pending_technical', 'pending_finance', 'pending_sales_head', 'approved']
    : ['draft', 'pending_finance', 'pending_sales_head', 'approved']
  const idx = stages.indexOf(status)
  if (status === 'rejected' || status === 'changes_requested') return -1
  return idx >= 0 ? idx : 0
}

export function isStageComplete(
  stageStatus: DealStatus,
  currentStatus: DealStatus,
  requiresTechnical: boolean
): boolean {
  const currentIdx = getStageIndex(currentStatus, requiresTechnical)
  const stageIdx = getStageIndex(stageStatus, requiresTechnical)
  if (currentStatus === 'approved') return true
  if (currentStatus === 'rejected') return stageIdx < currentIdx
  return stageIdx < currentIdx
}

export function isStageActive(
  stageStatus: DealStatus,
  currentStatus: DealStatus
): boolean {
  return stageStatus === currentStatus
}
