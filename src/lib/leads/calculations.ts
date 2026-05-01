export const RATE_PLAN_MULTIPLIER: Record<string, number> = {
  base: 1,
  premium: 1.15,
}

export function calcRentalDays(pickupDate: string | null, returnDate: string | null): number {
  if (!pickupDate || !returnDate) return 1
  const p = new Date(pickupDate.slice(0, 16))
  const r = new Date(returnDate.slice(0, 16))
  if (r <= p) return 1
  return Math.max(1, Math.ceil((r.getTime() - p.getTime()) / 86400000))
}

export function calcTotal(
  category: { base_daily_cost: number | string; daily_price: number | string } | null | undefined,
  days: number,
  ratePlan: string = 'base'
): number {
  if (!category) return 0
  const baseCost = parseFloat(String(category.base_daily_cost)) || 0
  const margin = parseFloat(String(category.daily_price)) || 0
  const multiplier = RATE_PLAN_MULTIPLIER[ratePlan] ?? 1
  return (baseCost + margin) * days * multiplier
}

export function calcReservationAmount(
  agreedDailyPrice: number | null,
  categoryDailyPrice: number | string | null | undefined,
  days: number
): number {
  const rate = agreedDailyPrice != null
    ? agreedDailyPrice
    : parseFloat(String(categoryDailyPrice ?? 0)) || 0
  return rate * days
}
