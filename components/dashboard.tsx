'use client'

import { useMemo, useState } from 'react'
import { Lock, Plus } from 'lucide-react'
import type { Pc } from '@/lib/types'
import { useConsoleState, withRefresh } from '@/lib/use-cafe'
import { addPc, lockAllPcs } from '@/app/actions/cafe'
import { liveCost, PcTile, useNow } from './pc-tile'
import { PcDetail } from './pc-detail'
import {
  Btn,
  Card,
  EmptyState,
  Field,
  Modal,
  SectionTitle,
  StatCard,
  inputCls,
} from './ui-bits'

const ZONE_ORDER = ['vip', 'premium', 'standard'] as const

export function Dashboard() {
  const { state, isLoading, error } = useConsoleState()
  const now = useNow()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'occupied' | 'available' | 'offline'>('all')
  const [busy, setBusy] = useState(false)

  // New PC form
  const [newName, setNewName] = useState('')
  const [newZone, setNewZone] = useState('premium')
  const [newIp, setNewIp] = useState('')
  const [newRate, setNewRate] = useState(40)

  const selectedPc = state?.pcs.find((p) => p.id === selectedId) ?? null

  const stats = useMemo(() => {
    if (!state) return null
    const occupied = state.pcs.filter((p) => p.status === 'occupied').length
    const offline = state.pcs.filter((p) => p.status === 'offline').length
    const available = state.pcs.length - occupied - offline
    let running = 0
    for (const s of state.activeSessions) {
      const pc = state.pcs.find((p) => p.id === s.pcId)
      if (pc) running += liveCost(pc, s, state.settings, now).cost
    }
    const snackRunning = state.orders
      .filter(
        (o) =>
          o.status !== 'cancelled' &&
          state.activeSessions.some((s) => s.id === o.sessionId),
      )
      .reduce((sum, o) => sum + o.quantity * o.unitPrice, 0)
    return { occupied, offline, available, running: running + snackRunning }
  }, [state, now])

  if (error) {
    return (
      <EmptyState message="Could not reach the server. Check the database connection and try again." />
    )
  }
  if (isLoading || !state || !stats) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  const filteredPcs = state.pcs.filter((p) =>
    filter === 'all' ? true : p.status === filter,
  )
  const byZone = ZONE_ORDER.map((zone) => ({
    zone,
    pcs: filteredPcs.filter((p) => p.zone === zone),
  })).filter((g) => g.pcs.length > 0)
  const otherPcs = filteredPcs.filter(
    (p) => !ZONE_ORDER.includes(p.zone as (typeof ZONE_ORDER)[number]),
  )

  const sessionFor = (pc: Pc) =>
    state.activeSessions.find((s) => s.pcId === pc.id) ?? null
  const pendingFor = (pc: Pc) =>
    state.orders.filter((o) => o.pcId === pc.id && o.status === 'pending').length

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle
        title="Fleet dashboard"
        subtitle="Live status of every PC, session timers, and running revenue."
        actions={
          <>
            <Btn
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await withRefresh(() => lockAllPcs())
                } finally {
                  setBusy(false)
                }
              }}
            >
              <Lock className="size-3.5" aria-hidden="true" />
              Lock all idle
            </Btn>
            <Btn size="sm" variant="primary" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5" aria-hidden="true" />
              Add PC
            </Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="In session"
          value={String(stats.occupied)}
          tone="primary"
          hint={`${state.pcs.length} PCs total`}
        />
        <StatCard label="Available" value={String(stats.available)} tone="success" />
        <StatCard
          label="Offline"
          value={String(stats.offline)}
          tone={stats.offline > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Running revenue"
          value={`${stats.running.toFixed(2)}`}
          hint={`${state.settings.currency} · live sessions + snacks`}
          tone="success"
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter PCs">
        {(['all', 'occupied', 'available', 'offline'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
              filter === f
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {byZone.length === 0 && otherPcs.length === 0 ? (
        <EmptyState message="No PCs match this filter." />
      ) : (
        <>
          {byZone.map(({ zone, pcs }) => (
            <section key={zone} className="flex flex-col gap-2.5">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {zone} zone
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {pcs.map((pc) => (
                  <PcTile
                    key={pc.id}
                    pc={pc}
                    session={sessionFor(pc)}
                    settings={state.settings}
                    pendingOrders={pendingFor(pc)}
                    onSelect={() => setSelectedId(pc.id)}
                  />
                ))}
              </div>
            </section>
          ))}
          {otherPcs.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Other
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {otherPcs.map((pc) => (
                  <PcTile
                    key={pc.id}
                    pc={pc}
                    session={sessionFor(pc)}
                    settings={state.settings}
                    pendingOrders={pendingFor(pc)}
                    onSelect={() => setSelectedId(pc.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {selectedPc && (
        <PcDetail pc={selectedPc} state={state} onClose={() => setSelectedId(null)} />
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a PC">
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!newName.trim()) return
            setBusy(true)
            try {
              await withRefresh(() =>
                addPc({
                  name: newName.trim(),
                  zone: newZone,
                  ipAddress: newIp.trim(),
                  hourlyRate: newRate,
                }),
              )
              setAddOpen(false)
              setNewName('')
              setNewIp('')
            } finally {
              setBusy(false)
            }
          }}
        >
          <Field label="Name">
            <input
              className={inputCls}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="PC-14"
              required
            />
          </Field>
          <Field label="Zone">
            <select
              className={inputCls}
              value={newZone}
              onChange={(e) => setNewZone(e.target.value)}
            >
              <option value="vip">VIP</option>
              <option value="premium">Premium</option>
              <option value="standard">Standard</option>
            </select>
          </Field>
          <Field label="IP address">
            <input
              className={inputCls}
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="192.168.1.114"
            />
          </Field>
          <Field label="Hourly rate">
            <input
              type="number"
              min={1}
              step="0.5"
              className={inputCls}
              value={newRate}
              onChange={(e) => setNewRate(Number(e.target.value))}
            />
          </Field>
          <Btn variant="primary" disabled={busy} className="mt-1" {...{ type: 'submit' }}>
            Add PC
          </Btn>
        </form>
      </Modal>
    </div>
  )
}
