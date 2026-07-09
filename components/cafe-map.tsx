'use client'

import { Cookie, Crosshair, Lock, WifiOff, Wrench } from 'lucide-react'
import type { Pc, Session, Settings } from '@/lib/types'
import { formatDuration } from '@/lib/billing'
import { liveCost, useNow } from './pc-tile'

type StatusFilter = 'all' | 'occupied' | 'available' | 'offline'

function stationTone(pc: Pc) {
  if (pc.status === 'occupied')
    return {
      frame: 'border-accent/70 animate-neon-pulse',
      dot: 'bg-accent',
      text: 'text-accent',
      label: 'Engaged',
      blip: true,
    }
  if (pc.status === 'offline')
    return {
      frame: 'border-destructive/50 animate-neon-flicker opacity-70',
      dot: 'bg-destructive',
      text: 'text-destructive',
      label: 'No signal',
      blip: false,
    }
  if (pc.maintenance)
    return {
      frame: 'border-warning/60',
      dot: 'bg-warning',
      text: 'text-warning',
      label: 'Repair',
      blip: false,
    }
  return {
    frame: 'border-border hover:border-primary/70 hover:neon-ring',
    dot: 'bg-success',
    text: 'text-success',
    label: 'Ready',
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
      aria-label={`${pc.name}, ${tone.label}${pc.locked ? ', locked' : ''}${
        live ? `, ${formatDuration(live.seconds)} elapsed` : ''
      }`}
      className={`group relative w-full text-left transition-all duration-200 hover:z-10 hover:scale-[1.02] ${
        dimmed ? 'opacity-25' : ''
      }`}
    >
      <div
        className={`glass-deep relative flex flex-col gap-1 border p-2 transition-colors ${tone.frame}`}
        style={{
          clipPath:
            'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
        }}
      >
        {tone.blip && <span className="blip-ring" aria-hidden="true" />}

        {/* Crosshair appears on hover, like aiming at the station */}
        <Crosshair
          className="pointer-events-none absolute right-1 top-1 size-3 text-primary opacity-0 transition-opacity group-hover:opacity-80"
          aria-hidden="true"
        />

        <div className="flex items-center gap-1.5">
          <span
            className={`size-1.5 shrink-0 ${tone.dot} ${
              pc.status === 'occupied' ? 'animate-pulse' : ''
            }`}
            aria-hidden="true"
          />
          <span className="truncate font-mono text-[11px] font-bold tracking-wider">
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
            <span className="font-mono text-[11px] font-bold text-accent tabular-nums">
              {formatDuration(live.seconds)}
            </span>
            <span className="font-mono text-[10px] font-semibold text-foreground tabular-nums">
              {live.cost.toFixed(2)}
            </span>
          </div>
        ) : (
          <span
            className={`font-mono text-[9px] uppercase tracking-[0.2em] ${tone.text}`}
          >
            [ {tone.label} ]
          </span>
        )}
      </div>
    </button>
  )
}

/** Small spinning radar in the map corner. */
function Radar({ engaged, total }: { engaged: number; total: number }) {
  return (
    <div
      className="pointer-events-none absolute right-3 top-3 hidden size-16 items-center justify-center sm:flex"
      aria-hidden="true"
    >
      <div className="relative size-full overflow-hidden rounded-full border border-primary/40 bg-background/70">
        <span className="absolute inset-2 rounded-full border border-primary/20" />
        <span className="absolute inset-5 rounded-full border border-primary/15" />
        <span className="absolute left-1/2 top-0 h-full w-px bg-primary/15" />
        <span className="absolute left-0 top-1/2 h-px w-full bg-primary/15" />
        <div className="radar-cone" />
        <span className="absolute left-[30%] top-[40%] size-1 rounded-full bg-accent" />
        <span className="absolute left-[62%] top-[58%] size-1 rounded-full bg-success" />
      </div>
      <span className="absolute -bottom-4 font-mono text-[8px] uppercase tracking-widest text-primary">
        {engaged}/{total} live
      </span>
    </div>
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
  const rows = Math.max(leftRow.length, rightRow.length)

  return (
    <section
      aria-label="Deployment map of cafe stations"
      className="hud-brackets relative overflow-hidden border border-border bg-card/80 p-3 floor-grid sm:p-4"
    >
      {/* Radar sweep line across the map */}
      <div className="scan-sheen" aria-hidden="true" />

      {/* Corner radar */}
      <Radar engaged={engaged} total={pcs.length} />

      {/* Map header strip */}
      <div className="relative mb-3 flex items-center gap-2 border-b border-border pb-2">
        <span className="size-1.5 animate-pulse bg-primary" aria-hidden="true" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
          Tac-Map // Floor 01
        </span>
        <span className="hidden font-mono text-[9px] uppercase tracking-widest text-muted-foreground min-[480px]:inline">
          GRID N-{String(pcs.length).padStart(2, '0')}E
        </span>
      </div>

      <div className="relative">
        {/* Sector headers */}
        <div className="mb-2 grid grid-cols-[1fr_2rem_1fr] items-center gap-1 sm:grid-cols-[1fr_3.5rem_1fr]">
          <h2 className="text-center font-mono text-[10px] font-bold tracking-[0.25em] text-primary">
            A // VIP
          </h2>
          <span aria-hidden="true" />
          <h2 className="text-center font-mono text-[10px] font-bold tracking-[0.25em] text-primary">
            B // PREM
          </h2>
        </div>

        <div className="grid grid-cols-[1fr_2rem_1fr] gap-x-1 sm:grid-cols-[1fr_3.5rem_1fr] sm:gap-x-2">
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

          {/* Center corridor: patrol route with moving chevrons */}
          <div
            className="relative mx-auto w-4 self-stretch overflow-hidden sm:w-5"
            style={{ minHeight: `${rows * 3.25}rem` }}
            aria-hidden="true"
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
            <div
              className="absolute inset-0 animate-aisle-flow opacity-80"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(180deg, transparent 0, transparent 18px, color-mix(in oklab, var(--color-primary) 60%, transparent) 18px, color-mix(in oklab, var(--color-primary) 60%, transparent) 24px, transparent 24px, transparent 48px)',
                clipPath: 'polygon(50% 0%, 100% 40%, 50% 25%, 0% 40%)',
                backgroundSize: '100% 48px',
              }}
            />
            <div
              className="absolute inset-0 animate-aisle-flow"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(180deg, transparent 0, transparent 20px, color-mix(in oklab, var(--color-primary) 45%, transparent) 20px, color-mix(in oklab, var(--color-primary) 45%, transparent) 22px, transparent 22px, transparent 48px)',
              }}
            />
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

        {/* Extraction / entrance marker */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="h-px w-8 bg-primary/40" aria-hidden="true" />
          <span className="border border-primary/50 bg-background/70 px-3 py-0.5 font-mono text-[9px] uppercase tracking-[0.3em] text-primary">
            Entry point
          </span>
          <span className="h-px w-8 bg-primary/40" aria-hidden="true" />
        </div>
      </div>

      {/* Status legend, killfeed-style */}
      <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 bg-success" aria-hidden="true" /> Ready
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 bg-accent" aria-hidden="true" /> Engaged
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 bg-warning" aria-hidden="true" /> Repair
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 bg-destructive" aria-hidden="true" /> No signal
        </span>
      </div>
    </section>
  )
}
