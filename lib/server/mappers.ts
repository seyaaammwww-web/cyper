// Converts Drizzle rows (numeric -> string, timestamp -> Date) into
// plain client-facing types with numbers and epoch ms.

import type {
  ActivityEvent,
  Customer,
  Pc,
  Reservation,
  Session,
  Settings,
  Snack,
  SnackOrder,
} from '@/lib/types'
import type {
  activityLog,
  cafeSettings,
  customers,
  pcs,
  reservations,
  sessions,
  snackOrders,
  snacks,
} from '@/lib/db/schema'

const num = (v: string | number | null | undefined): number =>
  v == null ? 0 : typeof v === 'number' ? v : Number.parseFloat(v)

const ms = (d: Date | null | undefined): number => (d ? d.getTime() : 0)

export function mapPc(row: typeof pcs.$inferSelect): Pc {
  return {
    id: row.id,
    name: row.name,
    zone: (row.zone as Pc['zone']) ?? 'standard',
    ipAddress: row.ipAddress,
    hourlyRate: num(row.hourlyRate),
    status: row.status as Pc['status'],
    locked: row.locked,
    maintenance: row.maintenance,
    mapCol: row.mapCol === 'b' ? 'b' : 'a',
    slotIndex: row.slotIndex,
    lastHeartbeat: ms(row.lastHeartbeat),
  }
}

export function mapSession(row: typeof sessions.$inferSelect): Session {
  return {
    id: row.id,
    pcId: row.pcId,
    customerId: row.customerId,
    startTime: ms(row.startTime),
    endTime: row.endTime ? row.endTime.getTime() : null,
    offlineSeconds: row.offlineSeconds,
    status: row.status as Session['status'],
    timeCost: row.timeCost == null ? null : num(row.timeCost),
    snackCost: row.snackCost == null ? null : num(row.snackCost),
    discountPercent: num(row.discountPercent),
    billableSeconds: row.billableSeconds,
  }
}

export function mapOrder(row: typeof snackOrders.$inferSelect): SnackOrder {
  return {
    id: row.id,
    pcId: row.pcId,
    sessionId: row.sessionId,
    snackId: row.snackId,
    itemName: row.itemName,
    quantity: row.quantity,
    unitPrice: num(row.unitPrice),
    status: row.status as SnackOrder['status'],
    createdAt: ms(row.createdAt),
  }
}

export function mapSnack(row: typeof snacks.$inferSelect): Snack {
  return {
    id: row.id,
    name: row.name,
    price: num(row.price),
    stock: row.stock,
    lowStockThreshold: row.lowStockThreshold,
    active: row.active,
  }
}

export function mapCustomer(row: typeof customers.$inferSelect): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    notes: row.notes,
    prepaidBalance: num(row.prepaidBalance),
    loyaltyPoints: row.loyaltyPoints,
    totalSpent: num(row.totalSpent),
    visitCount: row.visitCount,
    createdAt: ms(row.createdAt),
  }
}

export function mapReservation(
  row: typeof reservations.$inferSelect,
): Reservation {
  return {
    id: row.id,
    pcId: row.pcId,
    customerId: row.customerId,
    customerName: row.customerName,
    startAt: ms(row.startAt),
    durationMinutes: row.durationMinutes,
    status: row.status as Reservation['status'],
    notes: row.notes,
  }
}

export function mapActivity(
  row: typeof activityLog.$inferSelect,
): ActivityEvent {
  return {
    id: row.id,
    pcId: row.pcId,
    category: row.category,
    action: row.action,
    detail: row.detail,
    createdAt: ms(row.createdAt),
  }
}

export function mapSettings(row: typeof cafeSettings.$inferSelect): Settings {
  return {
    cafeName: row.cafeName,
    currency: row.currency,
    offlineGraceSeconds: row.offlineGraceSeconds,
    minimumSessionMinutes: row.minimumSessionMinutes,
    billingRounding: row.billingRounding as Settings['billingRounding'],
    taxPercent: num(row.taxPercent),
    happyHourEnabled: row.happyHourEnabled,
    happyHourStart: row.happyHourStart,
    happyHourEnd: row.happyHourEnd,
    happyHourDiscountPercent: num(row.happyHourDiscountPercent),
    loyaltyPointsPerCurrency: num(row.loyaltyPointsPerCurrency),
  }
}
