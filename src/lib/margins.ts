import type { DealItem, DealOverhead, MarginSummary } from '@/types'

export function calculateLineRevenue(item: DealItem): number {
  return item.quantity * item.quoted_price
}

export function calculateLineCost(item: DealItem): number {
  return item.quantity * item.transfer_price
}

export function calculateOverheadTotal(
  overheads: DealOverhead[],
  baseRevenue: number
): number {
  return overheads.reduce((sum, oh) => {
    if (oh.is_percentage && oh.percentage_value) {
      return sum + baseRevenue * (oh.percentage_value / 100)
    }
    return sum + oh.amount
  }, 0)
}

export function calculateMargins(
  items: DealItem[],
  overheads: DealOverhead[] = []
): MarginSummary {
  const totalRevenue = items.reduce((s, i) => s + calculateLineRevenue(i), 0)
  const totalCost = items.reduce((s, i) => s + calculateLineCost(i), 0)
  const overheadTotal = calculateOverheadTotal(overheads, totalRevenue)
  const grossProfit = totalRevenue - totalCost
  const netProfit = grossProfit - overheadTotal

  const grossMarginPct =
    totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const netMarginPct =
    totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  return {
    totalRevenue,
    totalCost: totalCost + overheadTotal,
    overheadTotal,
    grossMarginPct,
    netMarginPct,
  }
}

export function ensureDealMargins<T extends Record<string, any>>(deal: T): T {
  if (!deal) return deal

  const hasNetMargin =
    deal.net_margin_pct !== undefined &&
    deal.net_margin_pct !== null &&
    !isNaN(Number(deal.net_margin_pct))

  const hasGrossMargin =
    deal.gross_margin_pct !== undefined &&
    deal.gross_margin_pct !== null &&
    !isNaN(Number(deal.gross_margin_pct))

  if (hasNetMargin && hasGrossMargin) return deal

  const totalRev = Number(deal.total_revenue ?? 0)
  const totalCost = Number(deal.total_cost ?? 0)

  const grossMargin = hasGrossMargin
    ? Number(deal.gross_margin_pct)
    : totalRev > 0
    ? ((totalRev - totalCost) / totalRev) * 100
    : 0

  const netMargin = hasNetMargin
    ? Number(deal.net_margin_pct)
    : totalRev > 0
    ? ((totalRev - totalCost) / totalRev) * 100
    : grossMargin

  return {
    ...deal,
    gross_margin_pct: grossMargin,
    net_margin_pct: netMargin,
  }
}

