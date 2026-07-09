import { db } from '@/lib/db'
import { activityLog, sessions, snackOrders } from '@/lib/db/schema'
import { mapActivity, mapSession } from '@/lib/server/mappers'
import { desc, eq, gte, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export interface AnalyticsPayload {
  dailyRevenue: { day: string; time: number; snacks: number }[]
  hourlyHeatmap: { hour: number; sessions: number }[]
  pcUtilization: { pcId: number; seconds: number; revenue: number }[]
  snackBreakdown: { name: string; quantity: number; revenue: number }[]
  recentSessions: ReturnType<typeof mapSession>[]
  activity: ReturnType<typeof mapActivity>[]
  totals: {
    revenueToday: number
    revenue7d: number
    revenue30d: number
    sessionsToday: number
    avgSessionMinutes: number
  }
}

export async function GET() {
  const since30 = new Date(Date.now() - 30 * 24 * 3600_000)

  const [daily, hourly, perPc, snacksAgg, recent, activityRows, totalsRow] =
    await Promise.all([
      db
        .select({
          day: sql<string>`to_char(${sessions.endTime}, 'YYYY-MM-DD')`,
          time: sql<number>`coalesce(sum(${sessions.timeCost}), 0)::float`,
          snacks: sql<number>`coalesce(sum(${sessions.snackCost}), 0)::float`,
        })
        .from(sessions)
        .where(gte(sessions.endTime, since30))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
      db
        .select({
          hour: sql<number>`extract(hour from ${sessions.startTime})::int`,
          sessions: sql<number>`count(*)::int`,
        })
        .from(sessions)
        .where(gte(sessions.startTime, since30))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
      db
        .select({
          pcId: sessions.pcId,
          seconds: sql<number>`coalesce(sum(${sessions.billableSeconds}), 0)::int`,
          revenue: sql<number>`coalesce(sum(${sessions.timeCost}), 0)::float`,
        })
        .from(sessions)
        .where(gte(sessions.startTime, since30))
        .groupBy(sessions.pcId)
        .orderBy(sql`3 desc`),
      db
        .select({
          name: snackOrders.itemName,
          quantity: sql<number>`coalesce(sum(${snackOrders.quantity}), 0)::int`,
          revenue: sql<number>`coalesce(sum(${snackOrders.quantity} * ${snackOrders.unitPrice}), 0)::float`,
        })
        .from(snackOrders)
        .where(gte(snackOrders.createdAt, since30))
        .groupBy(snackOrders.itemName)
        .orderBy(sql`3 desc`),
      db
        .select()
        .from(sessions)
        .where(eq(sessions.status, 'completed'))
        .orderBy(desc(sessions.endTime))
        .limit(30),
      db
        .select()
        .from(activityLog)
        .orderBy(desc(activityLog.createdAt))
        .limit(80),
      db
        .select({
          revenueToday: sql<number>`coalesce(sum(case when ${sessions.endTime} >= date_trunc('day', now()) then coalesce(${sessions.timeCost},0) + coalesce(${sessions.snackCost},0) end), 0)::float`,
          revenue7d: sql<number>`coalesce(sum(case when ${sessions.endTime} >= now() - interval '7 days' then coalesce(${sessions.timeCost},0) + coalesce(${sessions.snackCost},0) end), 0)::float`,
          revenue30d: sql<number>`coalesce(sum(coalesce(${sessions.timeCost},0) + coalesce(${sessions.snackCost},0)), 0)::float`,
          sessionsToday: sql<number>`count(case when ${sessions.startTime} >= date_trunc('day', now()) then 1 end)::int`,
          avgSessionMinutes: sql<number>`coalesce(avg(${sessions.billableSeconds}) / 60, 0)::float`,
        })
        .from(sessions)
        .where(gte(sessions.startTime, since30)),
    ])

  const payload: AnalyticsPayload = {
    dailyRevenue: daily,
    hourlyHeatmap: hourly,
    pcUtilization: perPc,
    snackBreakdown: snacksAgg,
    recentSessions: recent.map(mapSession),
    activity: activityRows.map(mapActivity),
    totals: totalsRow[0] ?? {
      revenueToday: 0,
      revenue7d: 0,
      revenue30d: 0,
      sessionsToday: 0,
      avgSessionMinutes: 0,
    },
  }

  return NextResponse.json(payload)
}
