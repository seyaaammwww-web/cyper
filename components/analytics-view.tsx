'use client'

import { Download } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAnalytics, useConsoleState } from '@/lib/use-cafe'
import { formatDuration } from '@/lib/billing'
import { Btn, Card, EmptyState, SectionTitle, StatCard } from './ui-bits'

const CHART_TOOLTIP = {
  contentStyle: {
    backgroundColor: 'var(--color-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '12px',
  },
  labelStyle: { color: 'var(--color-foreground)' },
} as const

export function AnalyticsView() {
  const { analytics } = useAnalytics()
  const { state } = useConsoleState()

  if (!analytics || !state) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  const currency = state.settings.currency
  const { totals } = analytics

  const dailyData = analytics.dailyRevenue.map((d) => ({
    ...d,
    label: d.day.slice(5),
    total: d.time + d.snacks,
  }))

  const heatmap = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${hour.toString().padStart(2, '0')}:00`,
    sessions:
      analytics.hourlyHeatmap.find((h) => h.hour === hour)?.sessions ?? 0,
  }))
  const maxHourly = Math.max(1, ...heatmap.map((h) => h.sessions))

  const utilization = analytics.pcUtilization
    .map((u) => ({
      ...u,
      name: state.pcs.find((p) => p.id === u.pcId)?.name ?? `PC #${u.pcId}`,
      hours: Math.round((u.seconds / 3600) * 10) / 10,
    }))
    .slice(0, 13)

  function exportCsv() {
    const rows = [
      ['day', 'time_revenue', 'snack_revenue', 'total'],
      ...analytics!.dailyRevenue.map((d) => [
        d.day,
        d.time.toFixed(2),
        d.snacks.toFixed(2),
        (d.time + d.snacks).toFixed(2),
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cyper-revenue-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        title="Analytics"
        subtitle="Revenue, utilization, and sales over the last 30 days."
        actions={
          <Btn size="sm" onClick={exportCsv}>
            <Download className="size-3.5" aria-hidden="true" />
            Export CSV
          </Btn>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Revenue today"
          value={totals.revenueToday.toFixed(2)}
          hint={currency}
          tone="success"
        />
        <StatCard
          label="Last 7 days"
          value={totals.revenue7d.toFixed(2)}
          hint={currency}
        />
        <StatCard
          label="Last 30 days"
          value={totals.revenue30d.toFixed(2)}
          hint={currency}
        />
        <StatCard
          label="Avg session"
          value={`${Math.round(totals.avgSessionMinutes)}m`}
          hint={`${totals.sessionsToday} sessions today`}
          tone="primary"
        />
      </div>

      {/* Daily revenue */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-bold">Daily revenue (time vs snacks)</h2>
        {dailyData.length === 0 ? (
          <EmptyState message="No completed sessions yet." />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  width={44}
                />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar
                  dataKey="time"
                  name="Time"
                  stackId="rev"
                  fill="var(--color-primary)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="snacks"
                  name="Snacks"
                  stackId="rev"
                  fill="var(--color-warning)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Hourly heatmap */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-bold">Busy hours (session starts)</h2>
          <div
            className="grid grid-cols-12 gap-1.5"
            role="img"
            aria-label="Hourly session heatmap"
          >
            {heatmap.map((h) => {
              const intensity = h.sessions / maxHourly
              return (
                <div key={h.hour} className="flex flex-col items-center gap-1">
                  <div
                    className="aspect-square w-full rounded"
                    style={{
                      backgroundColor:
                        h.sessions === 0
                          ? 'var(--color-muted)'
                          : `color-mix(in oklab, var(--color-primary) ${Math.round(
                              25 + intensity * 75,
                            )}%, var(--color-muted))`,
                    }}
                    title={`${h.label}: ${h.sessions} sessions`}
                  />
                  {h.hour % 4 === 0 && (
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {h.hour}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Darker cells mean more sessions started in that hour.
          </p>
        </Card>

        {/* Snack breakdown */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-bold">Top snacks by revenue</h2>
          {analytics.snackBreakdown.length === 0 ? (
            <EmptyState message="No snack sales yet." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.snackBreakdown.slice(0, 8)}
                  layout="vertical"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar dataKey="revenue" name="Revenue" radius={[0, 3, 3, 0]}>
                    {analytics.snackBreakdown.slice(0, 8).map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          i === 0
                            ? 'var(--color-warning)'
                            : 'var(--color-primary)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* PC utilization */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-bold">PC utilization (30 days)</h2>
        {utilization.length === 0 ? (
          <EmptyState message="No usage data yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {utilization.map((u) => {
              const maxRev = utilization[0]?.revenue || 1
              return (
                <div key={u.pcId} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 font-mono text-xs font-semibold">
                    {u.name}
                  </span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                    <div
                      className="h-full rounded bg-primary"
                      style={{
                        width: `${Math.max(2, (u.revenue / maxRev) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right font-mono text-xs text-muted-foreground">
                    {u.hours}h · {u.revenue.toFixed(0)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Recent sessions table */}
      <Card className="overflow-x-auto">
        <h2 className="px-4 pt-4 text-sm font-bold">Recent sessions</h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 font-medium">PC</th>
              <th className="px-4 py-2 font-medium">Duration</th>
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-4 py-2 font-medium">Snacks</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {analytics.recentSessions.slice(0, 12).map((s) => {
              const name =
                state.pcs.find((p) => p.id === s.pcId)?.name ?? `PC #${s.pcId}`
              const total = (s.timeCost ?? 0) + (s.snackCost ?? 0)
              return (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="px-4 py-2 font-mono text-xs">{name}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {formatDuration(s.billableSeconds ?? 0)}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {(s.timeCost ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {(s.snackCost ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs font-semibold">
                    {total.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
