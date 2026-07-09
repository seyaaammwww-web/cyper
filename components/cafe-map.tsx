'use client'

import { useState } from 'react'
import { Cookie, Crosshair, Lock, Move, WifiOff, Wrench } from 'lucide-react'
import type { Pc, Session, Settings } from '@/lib/types'
import { formatDuration } from '@/lib/billing'
import { movePc } from '@/app/actions/cafe'
import { withRefresh } from '@/lib/use-cafe'
import { liveCost, useNow } from './pc-tile'

type StatusFilter = 'all' | 'occupied' | 'available' | 'offline'
type MapCol = 'a' | 'b'

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
  editing,
  picked,
  onSelect,
}: {
  pc: Pc
  session: Session | null
  settings: Settings
  pendingOrders: number
  dimmed: boolean
  editing: boolean
  picked: boolean
  onSelect: () => void
}) {
  const now = useNow()
  const tone = stationTone(pc)
  const live = session ? liveCost(pc, session, settings, now) : null

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={
        editing
          ? `${pc.name}: ${picked ? 'محدد — اختار المكان الجديد' : 'دوس عشان تنقله'}`
          : `${pc.name}, ${
              pc.status === 'occupied'
                ? 'In session'
                : pc.status === 'offline'
                  ? 'Offline'
                  : pc.maintenance
                    ? 'Maintenance'
                    : 'Ready'
            }${pc.locked ? ', locked' : ''}${
              live ? `, ${formatDuration(live.seconds)} elapsed` : ''
            }`
      }
      className={`group relative w-full text-left transition-all ${
        dimmed && !editing ? 'opacity-25' : ''
      } ${editing ? 'cursor-grab' : ''} ${
        picked ? 'z-10 scale-105' : ''
      }`}
    >
      {tone.blip && !editing && (
        <span className="blip-ring clip-plate" aria-hidden="true" />
      )}

      <span
        className={`glass-station clip-plate relative flex min-w-0 flex-col gap-1 border p-2 transition-colors ${
          picked
            ? 'animate-target-pulse border-accent bg-accent/15'
            : editing
              ? 'border-dashed border-accent/60 bg-accent/5'
              : tone.frame
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span
            className={`size-1.5 shrink-0 ${tone.dot} ${
              pc.status === 'occupied' && !editing ? 'animate-pulse' : ''
            }`}
            aria-hidden="true"
          />
          <span className="truncate font-mono text-[11px] font-bold tracking-wide">
            {pc.name}
          </span>
          <span className="ml-auto flex items-center gap-1">
            {editing ? (
              <Move className="size-3 text-accent" aria-hidden="true" />
            ) : (
              <>
                {pendingOrders > 0 && (
                  <span className="flex items-center gap-0.5 bg-warning px-1 font-mono text-[9px] font-bold text-warning-foreground">
                    <Cookie className="size-2.5" aria-hidden="true" />
                    {pendingOrders}
                  </span>
                )}
                {pc.maintenance && (
                  <Wrench
                    className="size-3 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                {pc.locked && (
                  <Lock
                    className="size-3 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                {pc.status === 'offline' && (
                  <WifiOff className="size-3 text-destructive" aria-hidden="true" />
                )}
              </>
            )}
          </span>
        </span>

        {live && !editing ? (
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
            className={`font-mono text-[9px] font-semibold uppercase tracking-[0.2em] ${
              editing ? 'text-accent' : tone.text
            }`}
          >
            {editing ? (picked ? '[ اختار المكان ]' : '[ انقلني ]') : `[ ${tone.label} ]`}
          </span>
        )}
      </span>
    </button>
  )
}

function EmptySlot({
  active,
  onDrop,
}: {
  active: boolean
  onDrop: () => void
}) {
  return (
    <button
      type="button"
      disabled={!active}
      onClick={onDrop}
      aria-label={active ? 'مكان فاضي — دوس عشان تحط الجهاز هنا' : 'مكان فاضي'}
      className={`clip-plate flex min-h-12 w-full items-center justify-center border border-dashed font-mono text-[9px] uppercase tracking-[0.2em] transition-colors ${
        active
          ? 'border-accent bg-accent/10 text-accent hover:bg-accent/20'
          : 'border-border/60 text-muted-foreground/40'
      }`}
    >
      {active ? '[ حط هنا ]' : '· · ·'}
    </button>
  )
}

export function CafeMap({
  pcs,
  sessionFor,
  pendingFor,
  settings,
  filter,
  editing,
  onSelect,
}: {
  pcs: Pc[]
  sessionFor: (pc: Pc) => Session | null
  pendingFor: (pc: Pc) => number
  settings: Settings
  filter: StatusFilter
  editing: boolean
  onSelect: (id: number) => void
}) {
  const [pickedId, setPickedId] = useState<number | null>(null)
  const [moving, setMoving] = useState(false)

  const colPcs = (col: MapCol) =>
    pcs.filter((p) => p.mapCol === col).sort((a, b) => a.slotIndex - b.slotIndex)

  const colA = colPcs('a')
  const colB = colPcs('b')
  // Rows: enough for the fullest column, +1 empty row while editing so PCs
  // can be pushed to the end of either column.
  const rows =
    Math.max(
      colA.length ? colA[colA.length - 1].slotIndex + 1 : 0,
      colB.length ? colB[colB.length - 1].slotIndex + 1 : 0,
      1,
    ) + (editing ? 1 : 0)

  const slotOccupant = (col: MapCol, idx: number) =>
    pcs.find((p) => p.mapCol === col && p.slotIndex === idx) ?? null

  const isDimmed = (pc: Pc) => filter !== 'all' && pc.status !== filter

  const engaged = pcs.filter((p) => p.status === 'occupied').length
  const ready = pcs.filter(
    (p) => p.status === 'available' && !p.maintenance,
  ).length
  const down = pcs.filter((p) => p.status === 'offline').length

  async function handleSlotTap(col: MapCol, idx: number) {
    const occupant = slotOccupant(col, idx)

    if (!editing) {
      if (occupant) onSelect(occupant.id)
      return
    }

    // Edit mode: first tap picks a PC, second tap moves/swaps it.
    if (pickedId == null) {
      if (occupant) setPickedId(occupant.id)
      return
    }
    if (occupant?.id === pickedId) {
      setPickedId(null) // tap again to cancel
      return
    }
    setMoving(true)
    try {
      await withRefresh(() => movePc(pickedId, { mapCol: col, slotIndex: idx }))
      setPickedId(null)
    } finally {
      setMoving(false)
    }
  }

  function renderSlot(col: MapCol, idx: number) {
    const occupant = slotOccupant(col, idx)
    if (occupant) {
      return (
        <Station
          key={occupant.id}
          pc={occupant}
          session={sessionFor(occupant)}
          settings={settings}
          pendingOrders={pendingFor(occupant)}
          dimmed={isDimmed(occupant)}
          editing={editing}
          picked={pickedId === occupant.id}
          onSelect={() => handleSlotTap(col, idx)}
        />
      )
    }
    if (!editing) return <span key={`${col}-${idx}`} className="min-h-2" />
    return (
      <EmptySlot
        key={`${col}-${idx}`}
        active={pickedId != null && !moving}
        onDrop={() => handleSlotTap(col, idx)}
      />
    )
  }

  return (
    <section
      aria-label="Station deployment map"
      className={`glass hud-brackets relative overflow-hidden border floor-grid ${
        editing ? 'border-accent/50' : ''
      }`}
    >
      {/* Radar refresh scanline */}
      {!editing && <div className="scan-sheen" aria-hidden="true" />}

      <div className="relative p-3 sm:p-4">
        {/* Map header strip */}
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <Crosshair
              className={`size-3.5 ${editing ? 'text-accent' : 'text-primary'}`}
              aria-hidden="true"
            />
            <h2
              className={`font-mono text-[10px] font-bold uppercase tracking-[0.25em] ${
                editing ? 'text-accent' : 'text-primary'
              }`}
            >
              {editing ? 'وضع التعديل // رتّب القاعة' : 'TAC-MAP // FLOOR 01'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[9px] uppercase tracking-wider text-muted-foreground sm:inline">
              {engaged} شغّال · {ready} فاضي · {down} مقطوع
            </span>
            <span className="radar-disc size-8 shrink-0" aria-hidden="true" />
          </div>
        </div>

        {editing && (
          <p className="mb-3 border border-accent/40 bg-accent/10 px-3 py-1.5 text-center font-sans text-xs text-accent">
            دوس على أي جهاز عشان تمسكه، وبعدين دوس على المكان الجديد — لو المكان
            مشغول هيتبدلوا مع بعض
          </p>
        )}

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
          {/* Sector A */}
          <div className="flex flex-col gap-2">
            {Array.from({ length: rows }, (_, i) => renderSlot('a', i))}
          </div>

          {/* Patrol corridor: chevron path */}
          <div
            className="relative mx-auto flex w-4 flex-col items-center justify-around gap-1 self-stretch overflow-hidden sm:w-5"
            aria-hidden="true"
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
            {Array.from({ length: rows }).map((_, i) => (
              <span
                key={i}
                className="relative font-mono text-[9px] leading-none text-primary/50"
              >
                ▼
              </span>
            ))}
          </div>

          {/* Sector B */}
          <div className="flex flex-col gap-2">
            {Array.from({ length: rows }, (_, i) => renderSlot('b', i))}
          </div>
        </div>

        {/* Entry point marker */}
        <div className="mt-3 flex justify-center">
          <span className="clip-plate border border-primary/40 bg-primary/10 px-3 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.3em] text-primary">
            ▲ المدخل // ENTRY
          </span>
        </div>

        {/* Killfeed-style legend */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-1.5 bg-primary" aria-hidden="true" /> فاضي
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 bg-warning" aria-hidden="true" /> شغّال
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 bg-destructive" aria-hidden="true" /> مقطوع
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 bg-muted-foreground" aria-hidden="true" />{' '}
            صيانة
          </span>
        </div>
      </div>
    </section>
  )
}
