'use client'

import { Armchair, Cookie, Lock, WifiOff, Wrench } from 'lucide-react'
import type { Pc, Session, Settings } from '@/lib/types'
import { formatDuration } from '@/lib/billing'
import { liveCost, useNow } from './pc-tile'

type StatusFilter = 'all' | 'occupied' | 'available' | 'offline'

function stationTone(pc: Pc) {
  if (pc.status === 'occupied')
    return {
      frame: 'border-primary/80 animate-neon-pulse',
      screen: 'bg-primary shadow-[0_0_10px_var(--color-primary)]',
      text: 'text-primary',
      label: 'In session',
      cone: 'light-cone',
    }
  if (pc.status === 'offline')
    return {
      frame: 'border-destructive/50 animate-neon-flicker opacity-75',
      screen: 'bg-muted',
      text: 'text-destructive',
      label: 'Offline',
      cone: null,
    }
  if (pc.maintenance)
    return {
      frame: 'border-warning/60',
      screen: 'bg-warning shadow-[0_0_8px_var(--color-warning)]',
      text: 'text-warning',
      label: 'Maintenance',
      cone: null,
    }
  return {
    frame: 'border-accent/50 hover:border-accent hover:neon-ring-cyan',
    screen: 'bg-accent shadow-[0_0_8px_var(--color-accent)]',
    text: 'text-accent',
    label: 'Available',
    cone: 'light-cone-cyan',
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
      className={`glass-station relative flex min-w-0 flex-1 flex-col gap-1 overflow-visible rounded-lg border p-2 transition-all ${tone.frame}`}
    >
      {/* Screen glow cone rising from the desk, like a lit monitor in a dark room */}
      {tone.cone && (
        <span
          className={`pointer-events-none absolute -top-3 left-1/2 h-3 w-10 -translate-x-1/2 animate-cone-breathe ${tone.cone}`}
          aria-hidden="true"
        />
      )}

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
          : 'border-border bg-muted/70 text-muted-foreground'
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
      className={`flex w-full items-center gap-1.5 rounded-xl text-left transition-all duration-300 hover:scale-[1.03] ${
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

/** Floating neon sparks drifting up through the scene, like dust in neon light. */
function Sparks() {
  const sparks = [
    { left: '8%', delay: '0s', size: 3, color: 'var(--color-primary)' },
    { left: '22%', delay: '2.2s', size: 2, color: 'var(--color-accent)' },
    { left: '38%', delay: '5s', size: 2, color: 'var(--color-primary)' },
    { left: '52%', delay: '1.4s', size: 3, color: 'var(--color-accent)' },
    { left: '64%', delay: '6.5s', size: 2, color: 'var(--color-primary)' },
    { left: '78%', delay: '3.6s', size: 3, color: 'var(--color-accent)' },
    { left: '90%', delay: '7.8s', size: 2, color: 'var(--color-primary)' },
  ]
  return (
    <span
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ containerType: 'size' }}
      aria-hidden="true"
    >
      {sparks.map((s, i) => (
        <span
          key={i}
          className="absolute bottom-0 animate-spark-rise rounded-full"
          style={{
            left: s.left,
            width: s.size,
            height: s.size,
            backgroundColor: s.color,
            boxShadow: `0 0 6px ${s.color}`,
            animationDelay: s.delay,
          }}
        />
      ))}
    </span>
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
      className="relative overflow-hidden rounded-2xl border border-primary/30 neon-ring"
    >
      {/* Artwork backdrop: the cafe's own cyberpunk art, dimmed into atmosphere */}
      <span className="scene-backdrop absolute inset-0" aria-hidden="true" />
      {/* Drifting neon haze that slowly shifts hue */}
      <span className="scene-haze absolute inset-0 animate-hue-drift" aria-hidden="true" />
      {/* Perspective neon floor receding into the scene */}
      <span
        className="perspective-floor absolute inset-x-0 bottom-0 h-2/3 opacity-60"
        aria-hidden="true"
      />
      {/* Rising light sparks */}
      <Sparks />
      {/* Soft moving scanline, like a CRT sweep across the room */}
      <span
        className="scanline-overlay pointer-events-none absolute inset-x-0 top-0 animate-scanline"
        aria-hidden="true"
      />
      {/* Edge vignette to focus the eye */}
      <span className="scene-vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* Neon wall strips */}
      <span
        className="pointer-events-none absolute inset-y-4 left-0 w-0.5 rounded-full bg-primary/80 neon-ring"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute inset-y-4 right-0 w-0.5 rounded-full bg-accent/80 neon-ring-cyan"
        aria-hidden="true"
      />

      <div className="relative p-3 sm:p-4">
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
          <div className="flex flex-col gap-2.5">
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

          {/* Center aisle: flowing neon light carpet */}
          <div
            className="relative mx-auto w-3 self-stretch overflow-hidden rounded-full sm:w-4"
            style={{ minHeight: `${rows * 3.5}rem` }}
            aria-hidden="true"
          >
            <div
              className="absolute inset-0 animate-aisle-flow rounded-full opacity-70"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(180deg, transparent 0, transparent 16px, color-mix(in oklab, var(--color-primary) 55%, transparent) 16px, color-mix(in oklab, var(--color-accent) 55%, transparent) 32px, transparent 32px, transparent 48px)',
              }}
            />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow:
                  'inset 0 0 8px color-mix(in oklab, var(--color-primary) 30%, transparent)',
              }}
            />
          </div>

          {/* Right vertical row (Premium + others) */}
          <div className="flex flex-col gap-2.5">
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
        <div className="mt-4 flex justify-center">
          <span className="rounded-full border border-accent/50 bg-background/60 px-3 py-0.5 font-mono text-[9px] uppercase tracking-[0.3em] text-accent neon-text-cyan backdrop-blur-sm">
            Entrance
          </span>
        </div>
      </div>
    </section>
  )
}
