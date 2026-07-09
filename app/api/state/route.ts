import { db } from '@/lib/db'
import {
  cafeSettings,
  customers,
  pcs,
  reservations,
  sessions,
  snackOrders,
  snacks,
} from '@/lib/db/schema'
import {
  mapCustomer,
  mapOrder,
  mapPc,
  mapReservation,
  mapSession,
  mapSettings,
  mapSnack,
} from '@/lib/server/mappers'
import type { ConsoleState } from '@/lib/types'
import { asc, desc, eq, gte } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const dayAgo = new Date(Date.now() - 24 * 3600_000)

  const [pcRows, sessionRows, orderRows, snackRows, customerRows, resRows, settingsRows] =
    await Promise.all([
      db.select().from(pcs).orderBy(asc(pcs.id)),
      db.select().from(sessions).where(eq(sessions.status, 'active')),
      db
        .select()
        .from(snackOrders)
        .where(gte(snackOrders.createdAt, dayAgo))
        .orderBy(desc(snackOrders.createdAt))
        .limit(100),
      db.select().from(snacks).orderBy(asc(snacks.id)),
      db.select().from(customers).orderBy(desc(customers.totalSpent)).limit(100),
      db
        .select()
        .from(reservations)
        .where(gte(reservations.startAt, new Date(Date.now() - 12 * 3600_000)))
        .orderBy(asc(reservations.startAt))
        .limit(50),
      db.select().from(cafeSettings).limit(1),
    ])

  const state: ConsoleState = {
    pcs: pcRows.map(mapPc),
    activeSessions: sessionRows.map(mapSession),
    orders: orderRows.map(mapOrder),
    snacks: snackRows.map(mapSnack),
    customers: customerRows.map(mapCustomer),
    reservations: resRows.map(mapReservation),
    settings: settingsRows[0]
      ? mapSettings(settingsRows[0])
      : ({} as ConsoleState['settings']),
    serverTime: Date.now(),
  }

  return NextResponse.json(state)
}
