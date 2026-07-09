'use client'

import { Armchair, Cookie, Lock, Monitor, WifiOff, Wrench } from 'lucide-react'
import type { Pc, Session, Settings } from '@/lib/types'
import { formatDuration } from '@/lib/billing'
import { liveCost, useNow } from './pc-tile'

type StatusFilter = 'all' | 'occupied' | 'available' | 'offline'

function stationTone(pc: Pc) {
  if (pc.status === 'occupied')
    return {
      frame: 'border-primary/70 bg-primary/10 animate-neon-pulse',
      screen: 'bg-primary/80',
      text: 'text-primary',
      label: 'In session',
    }
  if (pc.status === 'offline')
    return {
      frame: 'border-destructive/40 bg-destructive/5 animate-neon-flicker opacity-70',
      screen: 'bg-muted',
      text: 'text-destructive',
      label: 'Offline',
    }
  if (pc.maintenance)
    return {
      frame: 'border-warning/50 bg-warning/10',
      screen: 'bg-warning/70',
      text: 'text-warning',
      label: 'Maintenance',
    }
  return {
    frame: 'border-accent/40 bg-accent/5 hover:border-accent hover:neon-ring-cyan',
    screen: 'bg-accent/70',
    text: 'text-accent',
    label: 'Available',
  }
}

function Station({
  pc,
  session,
  settings,
  pendingOrders,
  dimmed,
  side,
  onSelect,
}: {
  pc: Pc
  session: Session | null
  settings: Settings
  pendingOrders: number
  dimmed: boolean
  side: 'left' | 'right'
  onSelect: () => void
}) {
  const now = useNow()
  const tone = stationTone(pc)
  const live = session ? liveCost(pc, session, settings, now) : null

  const desk = (
    <div
      className={`relative flex min-w-0 flex-1 flex-col gap-1 rounded-lg border p-2 transition-all ${tone.frame}`}
    >
      {/* Monitor bar: a glowing "screen" strip like a desk viewed from above */}
      <div className="flex items-center gap-1.5">
        <span
          className={`h-1.5 w-6 shrink-0 rounded-full ${tone.screen} ${
            pc.status === 'occupied' ? 'animate-neon-flicker' : ''
          }`}
          aria-hidden="true"
        />
        <span className="truncate font-mono text-[11px] font-bold">{pc.name}</span>
        <span className="ml-auto flex items-center gap-1">
          {pendingOrders > 0 && (
            <span className="flex items-center gap-0.5 rounded-full bg-warning px-1 font-mono text-[9px] font-bold text-warning-foreground">
              <Cookie className="size-2.5" aria-hidden="true" />
              {pendingOrders}
            </span>
          )}
          {pc.maintenance && (
            <Wrench className="size-3 text-warning" aria-hidden="true" />
          )}
          {pc.locked && (
            <Lock className="size-3 text-muted-foreground" aria-hidden="true" />
          )}
          {pc.status === 'offline' && (
            <WifiOff className="size-3 text-destructive" aria-hidden="true" />
          )}
        </span>
      </div>

      {live ? (
        <div className="flex items-center justify-between gap-1">
          <span className="font-mono text-[11px] font-bold text-primary tabular-nums neon-text">
            {formatDuration(live.seconds)}
          </span>
          <span className="font-mono text-[10px] font-semibold text-foreground">
            {live.cost.toFixed(2)}
          </span>
        </div>
      ) : (
        <span className={`font-mono text-[9px] uppercase tracking-wider ${tone.text}`}>
          {tone.label}
        </span>
      )}
    </div>
  )

  const chair = (
    <span
      className={`hidden size-6 shrink-0 items-center justify-center rounded-full border transition-colors min-[400px]:flex ${
        pc.status === 'occupied'
          ? 'border-primary/60 bg-primary/20 text-primary animate-float-slow'
          : 'border-border bg-muted text-muted-foreground'
      }`}
      aria-hidden="true"
    >
      <Armchair className="size-3.5" />
    </span>
  )

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${pc.name}, ${tone.label}${pc.locked ? ', locked' : ''}${
        live ? `, ${formatDuration(live.seconds)} elapsed` : ''
      }`}
      className={`flex w-full items-center gap-1.5 rounded-xl text-left transition-opacity ${
        dimmed ? 'opacity-25' : ''
      }`}
    >
      {side === 'left' ? (
        <>
          {desk}
          {chair}
        </>
      ) : (
        <>
          {chair}
          {desk}
        </>
      )}
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

  const rows = Math.max(leftRow.length, rightRow.length)

  return (
    <section
      aria-label="Cafe floor map"
      className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-3 floor-grid neon-ring sm:p-4"
    >
      {/* Neon wall strips */}
      <span
        className="pointer-events-none absolute inset-y-3 left-0 w-0.5 rounded-full bg-primary/70 neon-ring"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute inset-y-3 right-0 w-0.5 rounded-full bg-accent/70 neon-ring-cyan"
        aria-hidden="true"
      />

      {/* Zone headers */}
      <div className="mb-3 grid grid-cols-[1fr_2rem_1fr] items-center gap-1 sm:grid-cols-[1fr_3.5rem_1fr]">
        <h2 className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary neon-text">
          VIP row
        </h2>
        <span aria-hidden="true" />
        <h2 className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent neon-text-cyan">
          Premium row
        </h2>
      </div>

      <div className="grid grid-cols-[1fr_2rem_1fr] gap-x-1 sm:grid-cols-[1fr_3.5rem_1fr] sm:gap-x-2">
        {/* Left vertical row (VIP) */}
        <div className="flex flex-col gap-2">
          {leftRow.map((pc) => (
            <Station
              key={pc.id}
              pc={pc}
              session={sessionFor(pc)}
              settings={settings}
              pendingOrders={pendingFor(pc)}
              dimmed={isDimmed(pc)}
              side="left"
              onSelect={() => onSelect(pc.id)}
            />
          ))}
        </div>

        {/* Center aisle with flowing neon walkway */}
        <div
          className="relative mx-auto w-3 self-stretch overflow-hidden rounded-full sm:w-4"
          style={{ minHeight: `${rows * 3.5}rem` }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-0 animate-aisle-flow rounded-full opacity-60"
            style={{
              backgroundImage:
                'repeating-linear-gradient(180deg, transparent 0, transparent 16px, color-mix(in oklab, var(--color-primary) 45%, transparent) 16px, color-mix(in oklab, var(--color-accent) 45%, transparent) 32px, transparent 32px, transparent 48px)',
            }}
          />
        </div>

        {/* Right vertical row (Premium + others) */}
        <div className="flex flex-col gap-2">
          {rightRow.map((pc) => (
            <Station
              key={pc.id}
              pc={pc}
              session={sessionFor(pc)}
              settings={settings}
              pendingOrders={pendingFor(pc)}
              dimmed={isDimmed(pc)}
              side="right"
              onSelect={() => onSelect(pc.id)}
            />
          ))}
        </div>
      </div>

      {/* Entrance marker */}
      <div className="mt-3 flex justify-center">
        <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-0.5 font-mono text-[9px] uppercase tracking-[0.3em] text-accent neon-text-cyan">
          Entrance
        </span>
      </div>
    </section>
  )
}
