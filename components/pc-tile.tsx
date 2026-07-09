'use client'

import { Monitor, Wifi, WifiOff } from 'lucide-react'
import {
  formatDuration,
  formatMoney,
  computeBillableSeconds,
  computeTimeCost,
  type Pc,
} from '@/lib/demo-data'
import { useCafe } from '@/lib/store'

export function PcTile({ pc, onSelect }: { pc: Pc; onSelect: (pc: Pc) => void }) {
  const { sessions, settings } = useCafe()
  const session = sessions.find((s) => s.pcId === pc.id && s.status === 'active')

  const rawSeconds = session
    ? Math.floor((Date.now() - session.startTime) / 1000)
    : 0
  const runningCost = session
    ? computeTimeCost(
        computeBillableSeconds(rawSeconds, session.offlineSeconds, settings),
        pc.hourlyRate,
        settings,
      )
    : 0

  const statusStyles = {
    available: 'border-border bg-card hover:border-primary/60',
    occupied: 'border-success/40 bg-success/5 hover:border-success',
    offline: 'border-destructive/40 bg-destructive/5 hover:border-destructive',
  }[pc.status]

  const dotColor = {
    available: 'bg-muted-foreground',
    occupied: 'bg-success',
    offline: 'bg-destructive',
  }[pc.status]

  return (
    <button
      type="button"
      onClick={() => onSelect(pc)}
      className={`group flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors ${statusStyles}`}
      aria-label={`${pc.name}, ${pc.status}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="size-5 text-muted-foreground" aria-hidden="true" />
          <span className="font-mono text-sm font-semibold">{pc.name}</span>
        </div>
        <span className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${dotColor} ${pc.status === 'occupied' ? 'animate-pulse' : ''}`} />
          {pc.status === 'offline' ? (
            <WifiOff className="size-3.5 text-destructive" aria-hidden="true" />
          ) : (
            <Wifi className="size-3.5 text-muted-foreground" aria-hidden="true" />
          )}
        </span>
      </div>

      {session ? (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xl font-bold text-success tabular-nums">
            {formatDuration(rawSeconds)}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {formatMoney(runningCost, settings.currency)} · {pc.hourlyRate}/hr
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">
            {pc.status === 'offline' ? 'No heartbeat' : 'Ready'}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {pc.hourlyRate} {settings.currency}/hr
          </span>
        </div>
      )}

      <span className="font-mono text-[10px] text-muted-foreground/70">
        {pc.ipAddress}
      </span>
    </button>
  )
}
