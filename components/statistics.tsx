'use client'

import { Banknote, Cookie, Timer, TrendingUp } from 'lucide-react'
import { formatDuration, formatMoney } from '@/lib/demo-data'
import { useCafe } from '@/lib/store'

export function Statistics() {
  const { sessions, orders, pcs, settings } = useCafe()

  const completed = sessions.filter((s) => s.status === 'completed')
  const timeRevenue = completed.reduce((sum, s) => sum + (s.timeCost ?? 0), 0)
  const snackRevenue = completed.reduce((sum, s) => sum + (s.snackCost ?? 0), 0)
  const totalSeconds = completed.reduce(
    (sum, s) => sum + Math.floor(((s.endTime ?? s.startTime) - s.startTime) / 1000),
    0,
  )

  // Revenue per PC for the bar chart
  const perPc = pcs.map((pc) => {
    const revenue = completed
      .filter((s) => s.pcId === pc.id)
      .reduce((sum, s) => sum + (s.timeCost ?? 0) + (s.snackCost ?? 0), 0)
    return { name: pc.name, revenue }
  })
  const maxRevenue = Math.max(1, ...perPc.map((p) => p.revenue))

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Banknote className="size-4" aria-hidden="true" />}
          label="Total revenue"
          value={formatMoney(timeRevenue + snackRevenue, settings.currency)}
        />
        <StatCard
          icon={<TrendingUp className="size-4" aria-hidden="true" />}
          label="Time revenue"
          value={formatMoney(timeRevenue, settings.currency)}
        />
        <StatCard
          icon={<Cookie className="size-4" aria-hidden="true" />}
          label="Snack revenue"
          value={formatMoney(snackRevenue, settings.currency)}
        />
        <StatCard
          icon={<Timer className="size-4" aria-hidden="true" />}
          label="Total play time"
          value={formatDuration(totalSeconds)}
        />
      </div>

      <section aria-labelledby="perpc-heading" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <h2 id="perpc-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Revenue by PC (today)
        </h2>
        <div className="flex flex-col gap-2.5">
          {perPc.map((row) => (
            <div key={row.name} className="flex items-center gap-3">
              <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{row.name}</span>
              <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                <div
                  className="h-full rounded bg-primary transition-all"
                  style={{ width: `${(row.revenue / maxRevenue) * 100}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-right font-mono text-xs tabular-nums">
                {formatMoney(row.revenue, settings.currency)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="sessions-heading" className="flex flex-col gap-3">
        <h2 id="sessions-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Completed sessions ({completed.length})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-105 text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">PC</th>
                <th className="px-4 py-2.5 font-medium">Duration</th>
                <th className="px-4 py-2.5 font-medium">Time</th>
                <th className="px-4 py-2.5 font-medium">Snacks</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {completed
                .slice()
                .sort((a, b) => (b.endTime ?? 0) - (a.endTime ?? 0))
                .map((s) => {
                  const pcName = pcs.find((p) => p.id === s.pcId)?.name ?? `PC-${s.pcId}`
                  const dur = Math.floor(((s.endTime ?? s.startTime) - s.startTime) / 1000)
                  const total = (s.timeCost ?? 0) + (s.snackCost ?? 0)
                  return (
                    <tr key={s.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2.5 font-mono text-xs">{pcName}</td>
                      <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{formatDuration(dur)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{formatMoney(s.timeCost ?? 0, settings.currency)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{formatMoney(s.snackCost ?? 0, settings.currency)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-success">
                        {formatMoney(total, settings.currency)}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-mono text-lg font-bold">{value}</span>
    </div>
  )
}
