'use client'

import { useState } from 'react'
import {
  Activity,
  CalendarClock,
  Cookie,
  Cpu,
  Play,
  User,
} from 'lucide-react'
import { useAnalytics, useConsoleState } from '@/lib/use-cafe'
import { Badge, Card, EmptyState, SectionTitle } from './ui-bits'

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'session', label: 'Sessions' },
  { id: 'order', label: 'Orders' },
  { id: 'control', label: 'Controls' },
  { id: 'system', label: 'System' },
  { id: 'reservation', label: 'Reservations' },
  { id: 'customer', label: 'Customers' },
] as const

function categoryIcon(category: string) {
  switch (category) {
    case 'session':
      return Play
    case 'order':
      return Cookie
    case 'system':
      return Cpu
    case 'reservation':
      return CalendarClock
    case 'customer':
      return User
    default:
      return Activity
  }
}

function categoryTone(
  category: string,
): 'success' | 'warning' | 'primary' | 'muted' | 'destructive' {
  switch (category) {
    case 'session':
      return 'success'
    case 'order':
      return 'warning'
    case 'system':
      return 'destructive'
    case 'reservation':
      return 'primary'
    default:
      return 'muted'
  }
}

export function ActivityFeed() {
  const { analytics } = useAnalytics()
  const { state } = useConsoleState()
  const [filter, setFilter] = useState<string>('all')

  if (!analytics || !state) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />
  }

  const pcName = (id: number | null) =>
    id == null ? 'System' : (state.pcs.find((p) => p.id === id)?.name ?? `PC #${id}`)

  const events = analytics.activity.filter(
    (e) => filter === 'all' || e.category === filter,
  )

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle
        title="Activity log"
        subtitle="Full audit trail of everything that happens in the cafe."
      />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter activity">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            aria-pressed={filter === c.id}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === c.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <EmptyState message="No events in this category yet." />
      ) : (
        <Card className="divide-y divide-border/60">
          {events.map((e) => {
            const Icon = categoryIcon(e.category)
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                <Icon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm">
                    <span className="font-mono font-semibold">
                      {pcName(e.pcId)}
                    </span>{' '}
                    <span className="text-muted-foreground">
                      {e.action.replaceAll('_', ' ')}
                    </span>
                    {e.detail && (
                      <span className="text-foreground"> — {e.detail}</span>
                    )}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </div>
                <Badge tone={categoryTone(e.category)}>{e.category}</Badge>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
