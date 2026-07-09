'use server'

import { db } from '@/lib/db'
import {
  activityLog,
  cafeSettings,
  customers,
  pcs,
  reservations,
  sessions,
  snackOrders,
  snacks,
} from '@/lib/db/schema'
import {
  applyDiscount,
  computeBillableSeconds,
  computeTimeCost,
  isHappyHour,
} from '@/lib/billing'
import { mapSettings } from '@/lib/server/mappers'
import type { CheckoutResult, OrderStatus, ReservationStatus } from '@/lib/types'
import { and, eq, inArray, ne, sql } from 'drizzle-orm'

async function log(
  pcId: number | null,
  action: string,
  detail?: string,
  category = 'control',
) {
  await db.insert(activityLog).values({ pcId, action, detail, category })
}

async function getSettings() {
  const rows = await db.select().from(cafeSettings).limit(1)
  if (rows.length === 0) throw new Error('Settings not initialized')
  return mapSettings(rows[0])
}

// ---------- Sessions ----------

export async function startSession(pcId: number, customerId?: number | null) {
  const settings = await getSettings()
  const discount = isHappyHour(settings)
    ? settings.happyHourDiscountPercent
    : 0

  const [pc] = await db.select().from(pcs).where(eq(pcs.id, pcId)).limit(1)
  if (!pc) throw new Error('PC not found')
  if (pc.status === 'occupied') throw new Error('PC already occupied')
  if (pc.maintenance) throw new Error('PC is in maintenance mode')

  await db.insert(sessions).values({
    pcId,
    customerId: customerId ?? null,
    discountPercent: String(discount),
  })
  await db
    .update(pcs)
    .set({ status: 'occupied', locked: false })
    .where(eq(pcs.id, pcId))
  await log(
    pcId,
    'session_start',
    discount > 0 ? `happy hour -${discount}%` : undefined,
    'session',
  )
}

export async function endSession(pcId: number): Promise<CheckoutResult | null> {
  const settings = await getSettings()
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.pcId, pcId), eq(sessions.status, 'active')))
    .limit(1)
  if (!session) return null
  const [pc] = await db.select().from(pcs).where(eq(pcs.id, pcId)).limit(1)
  if (!pc) return null

  const rawSeconds = Math.floor(
    (Date.now() - session.startTime.getTime()) / 1000,
  )
  const billable = computeBillableSeconds(
    rawSeconds,
    session.offlineSeconds,
    settings,
  )
  const grossTime = computeTimeCost(
    billable,
    Number.parseFloat(pc.hourlyRate),
    settings,
  )
  const discountPercent = Number.parseFloat(session.discountPercent)
  const timeCost = applyDiscount(grossTime, discountPercent)
  const discount = Math.round((grossTime - timeCost) * 100) / 100

  const orderRows = await db
    .select()
    .from(snackOrders)
    .where(
      and(
        eq(snackOrders.sessionId, session.id),
        ne(snackOrders.status, 'cancelled'),
      ),
    )
  const snackCost = orderRows.reduce(
    (sum, o) => sum + o.quantity * Number.parseFloat(o.unitPrice),
    0,
  )
  const total = Math.round((timeCost + snackCost) * 100) / 100
  const loyaltyEarned = Math.floor(total * settings.loyaltyPointsPerCurrency)

  await db
    .update(sessions)
    .set({
      status: 'completed',
      endTime: new Date(),
      timeCost: String(timeCost),
      snackCost: String(snackCost),
      billableSeconds: billable,
    })
    .where(eq(sessions.id, session.id))
  await db
    .update(pcs)
    .set({ status: 'available', locked: true })
    .where(eq(pcs.id, pcId))

  if (session.customerId != null) {
    await db
      .update(customers)
      .set({
        totalSpent: sql`${customers.totalSpent} + ${total}`,
        loyaltyPoints: sql`${customers.loyaltyPoints} + ${loyaltyEarned}`,
        visitCount: sql`${customers.visitCount} + 1`,
      })
      .where(eq(customers.id, session.customerId))
  }

  await log(
    pcId,
    'session_end',
    `total ${total.toFixed(2)} ${settings.currency}`,
    'session',
  )

  return { timeCost, snackCost, discount, total, seconds: billable, loyaltyEarned }
}

// ---------- Snack orders ----------

export async function addOrder(pcId: number, snackId: number, quantity: number) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.pcId, pcId), eq(sessions.status, 'active')))
    .limit(1)
  if (!session) throw new Error('No active session on this PC')
  const [snack] = await db
    .select()
    .from(snacks)
    .where(eq(snacks.id, snackId))
    .limit(1)
  if (!snack || !snack.active) throw new Error('Snack unavailable')
  if (snack.stock < quantity) throw new Error('Not enough stock')

  await db.insert(snackOrders).values({
    pcId,
    sessionId: session.id,
    snackId,
    itemName: snack.name,
    quantity,
    unitPrice: snack.price,
  })
  await db
    .update(snacks)
    .set({ stock: sql`${snacks.stock} - ${quantity}` })
    .where(eq(snacks.id, snackId))
  await log(pcId, 'order_placed', `${quantity}x ${snack.name}`, 'order')
}

export async function setOrderStatus(orderId: number, status: OrderStatus) {
  const [order] = await db
    .select()
    .from(snackOrders)
    .where(eq(snackOrders.id, orderId))
    .limit(1)
  if (!order) return
  // Restock cancelled orders
  if (status === 'cancelled' && order.status !== 'cancelled' && order.snackId) {
    await db
      .update(snacks)
      .set({ stock: sql`${snacks.stock} + ${order.quantity}` })
      .where(eq(snacks.id, order.snackId))
  }
  await db
    .update(snackOrders)
    .set({ status })
    .where(eq(snackOrders.id, orderId))
  await log(order.pcId, `order_${status}`, order.itemName, 'order')
}

// ---------- PC controls ----------

export async function setPcLock(pcId: number, locked: boolean) {
  await db.update(pcs).set({ locked }).where(eq(pcs.id, pcId))
  await log(pcId, locked ? 'lock' : 'unlock')
}

export async function lockAllPcs() {
  const rows = await db
    .select({ id: pcs.id })
    .from(pcs)
    .where(and(ne(pcs.status, 'offline'), eq(pcs.locked, false)))
  if (rows.length === 0) return
  await db
    .update(pcs)
    .set({ locked: true })
    .where(
      inArray(
        pcs.id,
        rows.map((r) => r.id),
      ),
    )
  await log(null, 'lock_all', `${rows.length} PCs locked`)
}

export async function powerPc(
  pcId: number,
  action: 'shutdown' | 'restart' | 'sleep',
) {
  if (action === 'shutdown') {
    await db
      .update(pcs)
      .set({ status: 'offline', lastHeartbeat: new Date() })
      .where(and(eq(pcs.id, pcId), ne(pcs.status, 'occupied')))
  }
  await log(pcId, action)
}

export async function messagePc(pcId: number, message: string) {
  await log(pcId, 'message', message.slice(0, 200))
}

export async function togglePcOnline(pcId: number) {
  const [pc] = await db.select().from(pcs).where(eq(pcs.id, pcId)).limit(1)
  if (!pc) return
  if (pc.status === 'offline') {
    await db
      .update(pcs)
      .set({ status: 'available', lastHeartbeat: new Date() })
      .where(eq(pcs.id, pcId))
    await log(pcId, 'online', 'heartbeat resumed', 'system')
  } else if (pc.status === 'available') {
    await db.update(pcs).set({ status: 'offline' }).where(eq(pcs.id, pcId))
    await log(pcId, 'offline', 'heartbeat lost', 'system')
  }
}

export async function setPcMaintenance(pcId: number, maintenance: boolean) {
  await db.update(pcs).set({ maintenance }).where(eq(pcs.id, pcId))
  await log(
    pcId,
    maintenance ? 'maintenance_on' : 'maintenance_off',
    undefined,
    'system',
  )
}

// ---------- PC management ----------

export async function addPc(input: {
  name: string
  zone: string
  ipAddress: string
  hourlyRate: number
}) {
  await db.insert(pcs).values({
    name: input.name,
    zone: input.zone,
    ipAddress: input.ipAddress,
    hourlyRate: String(input.hourlyRate),
  })
  await log(null, 'pc_added', input.name, 'system')
}

export async function updatePc(
  pcId: number,
  input: { name?: string; zone?: string; ipAddress?: string; hourlyRate?: number },
) {
  await db
    .update(pcs)
    .set({
      ...(input.name != null ? { name: input.name } : {}),
      ...(input.zone != null ? { zone: input.zone } : {}),
      ...(input.ipAddress != null ? { ipAddress: input.ipAddress } : {}),
      ...(input.hourlyRate != null
        ? { hourlyRate: String(input.hourlyRate) }
        : {}),
    })
    .where(eq(pcs.id, pcId))
  await log(pcId, 'pc_updated', undefined, 'system')
}

// ---------- Customers ----------

export async function addCustomer(input: {
  name: string
  phone?: string
  notes?: string
}) {
  await db.insert(customers).values({
    name: input.name,
    phone: input.phone || null,
    notes: input.notes || null,
  })
  await log(null, 'customer_added', input.name, 'customer')
}

export async function topUpCustomer(customerId: number, amount: number) {
  if (amount <= 0) throw new Error('Amount must be positive')
  await db
    .update(customers)
    .set({ prepaidBalance: sql`${customers.prepaidBalance} + ${amount}` })
    .where(eq(customers.id, customerId))
  await log(null, 'top_up', `customer #${customerId} +${amount}`, 'customer')
}

// ---------- Reservations ----------

export async function addReservation(input: {
  pcId: number
  customerName: string
  customerId?: number | null
  startAt: number
  durationMinutes: number
  notes?: string
}) {
  await db.insert(reservations).values({
    pcId: input.pcId,
    customerId: input.customerId ?? null,
    customerName: input.customerName,
    startAt: new Date(input.startAt),
    durationMinutes: input.durationMinutes,
    notes: input.notes || null,
  })
  await log(input.pcId, 'reservation_created', input.customerName, 'reservation')
}

export async function setReservationStatus(
  id: number,
  status: ReservationStatus,
) {
  await db.update(reservations).set({ status }).where(eq(reservations.id, id))
  await log(null, `reservation_${status}`, `#${id}`, 'reservation')
}

// ---------- Snacks (inventory) ----------

export async function upsertSnack(input: {
  id?: number
  name: string
  price: number
  stock: number
  lowStockThreshold: number
  active: boolean
}) {
  if (input.id) {
    await db
      .update(snacks)
      .set({
        name: input.name,
        price: String(input.price),
        stock: input.stock,
        lowStockThreshold: input.lowStockThreshold,
        active: input.active,
      })
      .where(eq(snacks.id, input.id))
  } else {
    await db.insert(snacks).values({
      name: input.name,
      price: String(input.price),
      stock: input.stock,
      lowStockThreshold: input.lowStockThreshold,
      active: input.active,
    })
  }
  await log(null, 'snack_updated', input.name, 'system')
}

// ---------- Settings ----------

export async function updateSettings(input: {
  cafeName: string
  currency: string
  offlineGraceSeconds: number
  minimumSessionMinutes: number
  billingRounding: string
  taxPercent: number
  happyHourEnabled: boolean
  happyHourStart: number
  happyHourEnd: number
  happyHourDiscountPercent: number
  loyaltyPointsPerCurrency: number
}) {
  await db
    .update(cafeSettings)
    .set({
      cafeName: input.cafeName,
      currency: input.currency,
      offlineGraceSeconds: input.offlineGraceSeconds,
      minimumSessionMinutes: input.minimumSessionMinutes,
      billingRounding: input.billingRounding,
      taxPercent: String(input.taxPercent),
      happyHourEnabled: input.happyHourEnabled,
      happyHourStart: input.happyHourStart,
      happyHourEnd: input.happyHourEnd,
      happyHourDiscountPercent: String(input.happyHourDiscountPercent),
      loyaltyPointsPerCurrency: String(input.loyaltyPointsPerCurrency),
      updatedAt: new Date(),
    })
    .where(eq(cafeSettings.id, 1))
  await log(null, 'settings_updated', undefined, 'system')
}
