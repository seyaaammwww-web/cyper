// Billing rules shared by server actions and client-side live cost preview.
// Mirrors BillingService in the Flutter ManagerApp.

import type { Settings } from './types'

function roundUp(seconds: number, interval: number): number {
  if (seconds <= 0) return 0
  return Math.ceil(seconds / interval) * interval
}

export function computeBillableSeconds(
  rawSeconds: number,
  offlineSeconds: number,
  settings: Settings,
): number {
  let billable =
    rawSeconds + Math.max(0, offlineSeconds - settings.offlineGraceSeconds)
  const minimum = settings.minimumSessionMinutes * 60
  if (minimum > 0 && billable < minimum) billable = minimum
  if (settings.billingRounding === '5min') billable = roundUp(billable, 300)
  else if (settings.billingRounding === '15min')
    billable = roundUp(billable, 900)
  return billable
}

export function computeTimeCost(
  billableSeconds: number,
  hourlyRate: number,
  settings: Settings,
): number {
  let cost = (billableSeconds / 3600) * hourlyRate
  if (settings.taxPercent > 0) cost *= 1 + settings.taxPercent / 100
  return Math.round(cost * 100) / 100
}

export function isHappyHour(settings: Settings, at: Date = new Date()): boolean {
  if (!settings.happyHourEnabled) return false
  const hour = at.getHours()
  const { happyHourStart: start, happyHourEnd: end } = settings
  if (start === end) return false
  if (start < end) return hour >= start && hour < end
  // Overnight window (e.g. 22 -> 2)
  return hour >= start || hour < end
}

export function applyDiscount(cost: number, discountPercent: number): number {
  if (discountPercent <= 0) return cost
  return Math.round(cost * (1 - discountPercent / 100) * 100) / 100
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function formatMoney(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`
}
