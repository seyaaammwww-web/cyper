// Data model mirroring the real Cyper ManagerApp (Flutter) system.

export type PcStatus = 'available' | 'occupied' | 'offline'

export interface Pc {
  id: number
  name: string
  ipAddress: string
  hourlyRate: number
  status: PcStatus
  lastHeartbeat: number // epoch ms
}

export interface Session {
  id: number
  pcId: number
  startTime: number // epoch ms
  offlineSeconds: number
  status: 'active' | 'completed'
  endTime?: number
  timeCost?: number
  snackCost?: number
}

export type OrderStatus = 'pending' | 'delivered' | 'cancelled'

export interface SnackOrder {
  id: number
  pcId: number
  sessionId: number
  itemName: string
  quantity: number
  unitPrice: number
  status: OrderStatus
  createdAt: number
}

export interface Settings {
  cafeName: string
  currency: string
  offlineGraceSeconds: number
  minimumSessionMinutes: number
  billingRounding: 'none' | '5min' | '15min'
  taxPercent: number
}

export const DEFAULT_SETTINGS: Settings = {
  cafeName: 'Cyper Gaming Cafe',
  currency: 'EGP',
  offlineGraceSeconds: 300,
  minimumSessionMinutes: 15,
  billingRounding: '5min',
  taxPercent: 0,
}

// --- Billing (same rules as BillingService in the Flutter app) ---

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
  else if (settings.billingRounding === '15min') billable = roundUp(billable, 900)
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

// --- Seed data ---

export const SNACK_MENU = [
  { name: 'Cola', price: 15 },
  { name: 'Water', price: 8 },
  { name: 'Chips', price: 12 },
  { name: 'Chocolate Bar', price: 20 },
  { name: 'Energy Drink', price: 35 },
  { name: 'Instant Noodles', price: 25 },
]

const now = Date.now()

export const SEED_PCS: Pc[] = [
  { id: 1, name: 'PC-01', ipAddress: '192.168.1.101', hourlyRate: 40, status: 'occupied', lastHeartbeat: now },
  { id: 2, name: 'PC-02', ipAddress: '192.168.1.102', hourlyRate: 40, status: 'occupied', lastHeartbeat: now },
  { id: 3, name: 'PC-03', ipAddress: '192.168.1.103', hourlyRate: 40, status: 'available', lastHeartbeat: now },
  { id: 4, name: 'PC-04', ipAddress: '192.168.1.104', hourlyRate: 40, status: 'available', lastHeartbeat: now },
  { id: 5, name: 'PC-05', ipAddress: '192.168.1.105', hourlyRate: 60, status: 'occupied', lastHeartbeat: now },
  { id: 6, name: 'PC-06', ipAddress: '192.168.1.106', hourlyRate: 60, status: 'available', lastHeartbeat: now },
  { id: 7, name: 'PC-07', ipAddress: '192.168.1.107', hourlyRate: 60, status: 'offline', lastHeartbeat: now - 8 * 60_000 },
  { id: 8, name: 'PC-08', ipAddress: '192.168.1.108', hourlyRate: 40, status: 'available', lastHeartbeat: now },
]

export const SEED_SESSIONS: Session[] = [
  { id: 101, pcId: 1, startTime: now - 92 * 60_000, offlineSeconds: 0, status: 'active' },
  { id: 102, pcId: 2, startTime: now - 34 * 60_000, offlineSeconds: 120, status: 'active' },
  { id: 103, pcId: 5, startTime: now - 156 * 60_000, offlineSeconds: 0, status: 'active' },
  // Completed history for stats
  { id: 90, pcId: 3, startTime: now - 6 * 3600_000, endTime: now - 4 * 3600_000, offlineSeconds: 0, status: 'completed', timeCost: 80, snackCost: 27 },
  { id: 91, pcId: 4, startTime: now - 8 * 3600_000, endTime: now - 5.5 * 3600_000, offlineSeconds: 0, status: 'completed', timeCost: 100, snackCost: 0 },
  { id: 92, pcId: 6, startTime: now - 5 * 3600_000, endTime: now - 3 * 3600_000, offlineSeconds: 0, status: 'completed', timeCost: 120, snackCost: 55 },
  { id: 93, pcId: 1, startTime: now - 12 * 3600_000, endTime: now - 10 * 3600_000, offlineSeconds: 0, status: 'completed', timeCost: 80, snackCost: 15 },
]

export const SEED_ORDERS: SnackOrder[] = [
  { id: 201, pcId: 1, sessionId: 101, itemName: 'Energy Drink', quantity: 1, unitPrice: 35, status: 'pending', createdAt: now - 4 * 60_000 },
  { id: 202, pcId: 5, sessionId: 103, itemName: 'Chips', quantity: 2, unitPrice: 12, status: 'pending', createdAt: now - 9 * 60_000 },
  { id: 203, pcId: 2, sessionId: 102, itemName: 'Cola', quantity: 1, unitPrice: 15, status: 'delivered', createdAt: now - 20 * 60_000 },
  { id: 204, pcId: 1, sessionId: 101, itemName: 'Water', quantity: 1, unitPrice: 8, status: 'delivered', createdAt: now - 60 * 60_000 },
]
