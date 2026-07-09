// Client-facing types for the Cyper console. All timestamps are epoch ms.

export type PcStatus = 'available' | 'occupied' | 'offline'

export interface Pc {
  id: number
  name: string
  zone: 'vip' | 'premium' | 'standard'
  ipAddress: string
  hourlyRate: number
  status: PcStatus
  locked: boolean
  maintenance: boolean
  mapCol: 'a' | 'b'
  slotIndex: number
  lastHeartbeat: number
}

export interface Session {
  id: number
  pcId: number
  customerId: number | null
  startTime: number
  endTime: number | null
  offlineSeconds: number
  status: 'active' | 'completed'
  timeCost: number | null
  snackCost: number | null
  discountPercent: number
  billableSeconds: number | null
}

export type OrderStatus = 'pending' | 'delivered' | 'cancelled'

export interface SnackOrder {
  id: number
  pcId: number
  sessionId: number
  snackId: number | null
  itemName: string
  quantity: number
  unitPrice: number
  status: OrderStatus
  createdAt: number
}

export interface Snack {
  id: number
  name: string
  price: number
  stock: number
  lowStockThreshold: number
  active: boolean
}

export interface Customer {
  id: number
  name: string
  phone: string | null
  notes: string | null
  prepaidBalance: number
  loyaltyPoints: number
  totalSpent: number
  visitCount: number
  createdAt: number
}

export type ReservationStatus = 'upcoming' | 'seated' | 'cancelled' | 'no-show'

export interface Reservation {
  id: number
  pcId: number
  customerId: number | null
  customerName: string
  startAt: number
  durationMinutes: number
  status: ReservationStatus
  notes: string | null
}

export interface ActivityEvent {
  id: number
  pcId: number | null
  category: string
  action: string
  detail: string | null
  createdAt: number
}

export interface Settings {
  cafeName: string
  currency: string
  offlineGraceSeconds: number
  minimumSessionMinutes: number
  billingRounding: 'none' | '5min' | '15min'
  taxPercent: number
  happyHourEnabled: boolean
  happyHourStart: number
  happyHourEnd: number
  happyHourDiscountPercent: number
  loyaltyPointsPerCurrency: number
}

export interface ConsoleState {
  pcs: Pc[]
  activeSessions: Session[]
  orders: SnackOrder[]
  snacks: Snack[]
  customers: Customer[]
  reservations: Reservation[]
  settings: Settings
  serverTime: number
}

export interface CheckoutResult {
  timeCost: number
  snackCost: number
  discount: number
  total: number
  seconds: number
  loyaltyEarned: number
}
