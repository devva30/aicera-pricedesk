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
