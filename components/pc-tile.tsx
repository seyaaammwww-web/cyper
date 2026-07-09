'use client'

import { useEffect, useState } from 'react'
import { Lock, Monitor, Wrench } from 'lucide-react'
import type { Pc, Session, Settings } from '@/lib/types'
import {
  applyDiscount,
  computeBillableSeconds,
  computeTimeCost,
  formatDuration,
} from '@/lib/billing'

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export function liveCost(
  pc: Pc,
  session: Session,
  settings: Settings,
  now: number,
): { seconds: number; cost: number } {
  const raw = Math.max(0, Math.floor((now - session.startTime) / 1000))
  const billable = computeBillableSeconds(raw, session.offlineSeconds, settings)
  const gross = computeTimeCost(billable, pc.hourlyRate, settings)
  return { seconds: raw, cost: applyDiscount(gross, session.discountPercent) }
}

export function PcTile({
  pc,
  session,
  settings,
  pendingOrders,
  onSelect,
}: {
  pc: Pc
  session: Session | null
  settings: Settings
  pendingOrders: number
  onSelect: () => void
}) {
  const now = useNow()

  const statusStyles =
    pc.status === 'occupied'
      ? 'border-primary/40 bg-primary/5 hover:border-primary'
      : pc.status === 'offline'
        ? 'border-destructive/30 bg-destructive/5 opacity-75 hover:border-destructive/60'
        : pc.maintenance
          ? 'border-warning/40 bg-warning/5 hover:border-warning'
          : 'border-border bg-card hover:border-success/60'

  const dotColor =
    pc.status === 'occupied'
      ? 'bg-primary'
      : pc.status === 'offline'
        ? 'bg-destructive'
        : pc.maintenance
          ? 'bg-warning'
          : 'bg-success'

  const statusLabel =
    pc.status === 'occupied'
      ? 'In session'
      : pc.status === 'offline'
        ? 'Offline'
        : pc.maintenance
          ? 'Maintenance'
          : 'Available'

  const live = session ? liveCost(pc, session, settings, now) : null

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex flex-col gap-2 rounded-xl border p-3.5 text-left transition-colors ${statusStyles}`}
      aria-label={`${pc.name}, ${statusLabel}${pc.locked ? ', locked' : ''}`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <Monitor
            className={`size-4 ${pc.status === 'occupied' ? 'text-primary' : 'text-muted-foreground'}`}
            aria-hidden="true"
          />
          <span className="font-mono text-sm font-bold">{pc.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {pc.maintenance && (
            <Wrench className="size-3.5 text-warning" aria-hidden="true" />
          )}
          {pc.locked && (
            <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" />
          )}
          <span
            className={`size-2 rounded-full ${dotColor} ${pc.status === 'occupied' ? 'animate-pulse' : ''}`}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {pc.zone}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {pc.hourlyRate.toFixed(0)} {settings.currency}/h
        </span>
      </div>

      {live ? (
        <div className="flex items-end justify-between gap-1 border-t border-border/60 pt-2">
          <span className="font-mono text-sm font-bold text-primary tabular-nums">
            {formatDuration(live.seconds)}
          </span>
          <span className="font-mono text-xs font-semibold">
            {live.cost.toFixed(2)}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-1 border-t border-border/60 pt-2">
          <span className="text-xs text-muted-foreground">{statusLabel}</span>
        </div>
      )}

      {pendingOrders > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-warning font-mono text-[10px] font-bold text-warning-foreground">
          {pendingOrders}
        </span>
      )}
    </button>
  )
}
