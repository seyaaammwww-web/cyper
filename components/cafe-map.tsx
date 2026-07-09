'use client'

import { Cookie, Crosshair, Lock, WifiOff, Wrench } from 'lucide-react'
import type { Pc, Session, Settings } from '@/lib/types'
import { formatDuration } from '@/lib/billing'
import { liveCost, useNow } from './pc-tile'

type StatusFilter = 'all' | 'occupied' | 'available' | 'offline'

function stationTone(pc: Pc) {
  if (pc.status === 'occupied')
    return {
      frame: 'border-warning/70 bg-warning/10 animate-target-pulse',
      dot: 'bg-warning',
      text: 'text-warning',
      label: 'ENGAGED',
      blip: true,
    }
  if (pc.status === 'offline')
    return {
      frame: 'border-destructive/50 bg-destructive/5 animate-signal-flicker opacity-80',
      dot: 'bg-destructive',
      text: 'text-destructive',
      label: 'NO SIGNAL',
      blip: false,
    }
  if (pc.maintenance)
    return {
      frame: 'border-muted-foreground/40 bg-muted/40',
      dot: 'bg-muted-foreground',
      text: 'text-muted-foreground',
      label: 'SERVICING',
      blip: false,
    }
  return {
    frame: 'border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10',
    dot: 'bg-primary',
    text: 'text-primary',
    label: 'READY',
    blip: false,
  }
}

function Station({
  pc,
  session,
  settings,
  pendingOrders,
  dimmed,
  onSelect,
}: {
  pc: Pc
  session: Session | null
  settings: Settings
  pendingOrders: number
  dimmed: boolean
  onSelect: () => void
}) {
  const now = useNow()
  const tone = stationTone(pc)
  const live = session ? liveCost(pc, session, settings, now) : null

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${pc.name}, ${
        pc.status === 'occupied'
          ? 'In session'
          : pc.status === 'offline'
            ? 'Offline'
            : pc.maintenance
              ? 'Maintenance'
              : 'Ready'
      }${pc.locked ? ', locked' : ''}${
        live ? `, ${formatDuration(live.seconds)} elapsed` : ''
      }`}
      className={`group relative w-full text-left transition-opacity ${
        dimmed ? 'opacity-25' : ''
      }`}
    >
      {tone.blip && <span className="blip-ring clip-plate" aria-hidden="true" />}

      <span
        className={`glass-station clip-plate relative flex min-w-0 flex-col gap-1 border p-2 transition-colors ${tone.frame}`}
      >
        <span className="flex items-center gap-1.5">
          <span
            className={`size-1.5 shrink-0 ${tone.dot} ${
              pc.status === 'occupied' ? 'animate-pulse' : ''
            }`}
            aria-hidden="true"
          />
          <span className="truncate font-mono text-[11px] font-bold tracking-wide">
            {pc.name}
          </span>
          <span className="ml-auto flex items-center gap-1">
            {pendingOrders > 0 && (
              <span className="flex items-center gap-0.5 bg-warning px-1 font-mono text-[9px] font-bold text-warning-foreground">
                <Cookie className="size-2.5" aria-hidden="true" />
                {pendingOrders}
              </span>
            )}
            {pc.maintenance && (
              <Wrench className="size-3 text-muted-foreground" aria-hidden="true" />
            )}
            {pc.locked && (
              <Lock className="size-3 text-muted-foreground" aria-hidden="true" />
            )}
            {pc.status === 'offline' && (
              <WifiOff className="size-3 text-destructive" aria-hidden="true" />
            )}
          </span>
        </span>

        {live ? (
          <span className="flex items-center justify-between gap-1">
            <span className="font-mono text-[11px] font-bold text-warning tabular-nums">
              {formatDuration(live.seconds)}
            </span>
            <span className="font-mono text-[10px] font-semibold tabular-nums">
              {live.cost.toFixed(2)}
            </span>
          </span>
        ) : (
          <span
            className={`font-mono text-[9px] font-semibold uppercase tracking-[0.2em] ${tone.text}`}
          >
            [ {tone.label} ]
          </span>
        )}
      </span>
    </button>
  )
}

export function CafeMap({
  pcs,
  sessionFor,
  pendingFor,
  settings,
  filter,
  onSelect,
}: {
  pcs: Pc[]
  sessionFor: (pc: Pc) => Session | null
  pendingFor: (pc: Pc) => number
  settings: Settings
  filter: StatusFilter
  onSelect: (id: number) => void
}) {
  const sortByName = (a: Pc, b: Pc) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  const leftRow = pcs.filter((p) => p.zone === 'vip').sort(sortByName)
  const rightRow = pcs.filter((p) => p.zone !== 'vip').sort(sortByName)

  const isDimmed = (pc: Pc) => filter !== 'all' && pc.status !== filter

  const engaged = pcs.filter((p) => p.status === 'occupied').length
  const ready = pcs.filter(
    (p) => p.status === 'available' && !p.maintenance,
  ).length
  const down = pcs.filter((p) => p.status === 'offline').length

  return (
    <section
      aria-label="Station deployment map"
      className="glass hud-brackets relative overflow-hidden border floor-grid"
    >
      {/* Radar refresh scanline */}
      <div className="scan-sheen" aria-hidden="true" />

      <div className="relative p-3 sm:p-4">
        {/* Map header strip */}
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <Crosshair className="size-3.5 text-primary" aria-hidden="true" />
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
              TAC-MAP // FLOOR 01
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[9px] uppercase tracking-wider text-muted-foreground sm:inline">
              {engaged} engaged · {ready} ready · {down} down
            </span>
            <span className="radar-disc size-8 shrink-0" aria-hidden="true" />
          </div>
        </div>

        {/* Sector headers */}
        <div className="mb-2 grid grid-cols-[1fr_1.75rem_1fr] items-center gap-1 sm:grid-cols-[1fr_3rem_1fr]">
          <h3 className="text-center font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-foreground">
            SECTOR A // VIP
          </h3>
          <span aria-hidden="true" />
          <h3 className="text-center font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            SECTOR B // PREM
          </h3>
        </div>

        <div className="grid grid-cols-[1fr_1.75rem_1fr] gap-x-1 sm:grid-cols-[1fr_3rem_1fr] sm:gap-x-2">
          {/* Sector A (VIP) */}
          <div className="flex flex-col gap-2">
            {leftRow.map((pc) => (
              <Station
                key={pc.id}
                pc={pc}
                session={sessionFor(pc)}
                settings={settings}
                pendingOrders={pendingFor(pc)}
                dimmed={isDimmed(pc)}
                onSelect={() => onSelect(pc.id)}
              />
            ))}
          </div>

          {/* Patrol corridor: chevron path */}
          <div
            className="relative mx-auto flex w-4 flex-col items-center justify-around gap-1 self-stretch overflow-hidden sm:w-5"
            aria-hidden="true"
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
            {Array.from({ length: Math.max(leftRow.length, rightRow.length) }).map(
              (_, i) => (
                <span
                  key={i}
                  className="relative font-mono text-[9px] leading-none text-primary/50"
                >
                  ▼
                </span>
              ),
            )}
          </div>

          {/* Sector B (Premium + others) */}
          <div className="flex flex-col gap-2">
            {rightRow.map((pc) => (
              <Station
                key={pc.id}
                pc={pc}
                session={sessionFor(pc)}
                settings={settings}
                pendingOrders={pendingFor(pc)}
                dimmed={isDimmed(pc)}
                onSelect={() => onSelect(pc.id)}
              />
            ))}
          </div>
        </div>

        {/* Entry point marker */}
        <div className="mt-3 flex justify-center">
          <span className="clip-plate border border-primary/40 bg-primary/10 px-3 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.3em] text-primary">
            ▲ ENTRY POINT
          </span>
        </div>

        {/* Killfeed-style legend */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-1.5 bg-primary" aria-hidden="true" /> Ready
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 bg-warning" aria-hidden="true" /> Engaged
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 bg-destructive" aria-hidden="true" /> Down
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 bg-muted-foreground" aria-hidden="true" />{' '}
            Servicing
          </span>
        </div>
      </div>
    </section>
  )
}
