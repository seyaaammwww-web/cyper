'use client'

import { useState } from 'react'
import { CalendarClock, Check, Plus, X } from 'lucide-react'
import { useConsoleState, withRefresh } from '@/lib/use-cafe'
import { addReservation, setReservationStatus, startSession } from '@/app/actions/cafe'
import type { ReservationStatus } from '@/lib/types'
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  Modal,
  SectionTitle,
  inputCls,
} from './ui-bits'

const STATUS_TONE: Record<ReservationStatus, 'primary' | 'success' | 'destructive' | 'muted'> = {
  upcoming: 'primary',
  seated: 'success',
  cancelled: 'muted',
  'no-show': 'destructive',
}

export function ReservationsView() {
  const { state } = useConsoleState()
  const [addOpen, setAddOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!state) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />
  }

  const pcName = (id: number) =>
    state.pcs.find((p) => p.id === id)?.name ?? `PC #${id}`

  const upcoming = state.reservations
    .filter((r) => r.status === 'upcoming')
    .sort((a, b) => a.startAt - b.startAt)
  const past = state.reservations
    .filter((r) => r.status !== 'upcoming')
    .sort((a, b) => b.startAt - a.startAt)
    .slice(0, 15)

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    try {
      await withRefresh(fn)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        title="Reservations"
        subtitle="Book PCs ahead of time and seat customers when they arrive."
        actions={
          <Btn size="sm" variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" aria-hidden="true" />
            New reservation
          </Btn>
        }
      />

      <section className="flex flex-col gap-2.5">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState message="No upcoming reservations. Create one to hold a PC for a customer." />
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map((r) => {
              const pc = state.pcs.find((p) => p.id === r.pcId)
              const canSeat = pc?.status === 'available' && !pc.maintenance
              const overdue = r.startAt < Date.now()
              return (
                <Card key={r.id} className="flex flex-wrap items-center gap-3 p-3.5">
                  <CalendarClock
                    className={`size-4 shrink-0 ${overdue ? 'text-warning' : 'text-primary'}`}
                    aria-hidden="true"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {r.customerName}
                      <span className="text-muted-foreground">
                        {' '}
                        · {pcName(r.pcId)} · {r.durationMinutes}m
                      </span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(r.startAt).toLocaleString()}
                      {overdue && (
                        <span className="text-warning"> · overdue</span>
                      )}
                    </span>
                    {r.notes && (
                      <span className="text-xs text-muted-foreground">{r.notes}</span>
                    )}
                  </div>
                  <Btn
                    size="sm"
                    variant="success"
                    disabled={busy || !canSeat}
                    title={canSeat ? undefined : 'PC is not available'}
                    onClick={() =>
                      run(async () => {
                        await startSession(r.pcId, r.customerId)
                        await setReservationStatus(r.id, 'seated')
                      })
                    }
                  >
                    <Check className="size-3.5" aria-hidden="true" />
                    Seat &amp; start
                  </Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => run(() => setReservationStatus(r.id, 'no-show'))}
                  >
                    No-show
                  </Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => run(() => setReservationStatus(r.id, 'cancelled'))}
                    aria-label={`Cancel reservation for ${r.customerName}`}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </Btn>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            History
          </h2>
          <Card className="divide-y divide-border/60">
            {past.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 truncate text-sm text-muted-foreground">
                  {r.customerName} · {pcName(r.pcId)} ·{' '}
                  {new Date(r.startAt).toLocaleString()}
                </span>
                <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
              </div>
            ))}
          </Card>
        </section>
      )}

      {addOpen && (
        <NewReservationModal onClose={() => setAddOpen(false)} state={state} />
      )}
    </div>
  )
}

function NewReservationModal({
  onClose,
  state,
}: {
  onClose: () => void
  state: NonNullable<ReturnType<typeof useConsoleState>['state']>
}) {
  const [pcId, setPcId] = useState<number | ''>('')
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [when, setWhen] = useState('')
  const [duration, setDuration] = useState(60)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const effectiveName =
    customerId !== ''
      ? (state.customers.find((c) => c.id === customerId)?.name ?? name)
      : name

  return (
    <Modal open onClose={onClose} title="New reservation">
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          if (pcId === '' || !effectiveName.trim() || !when) return
          setBusy(true)
          try {
            await withRefresh(() =>
              addReservation({
                pcId: pcId as number,
                customerId: customerId === '' ? null : customerId,
                customerName: effectiveName.trim(),
                startAt: new Date(when).getTime(),
                durationMinutes: duration,
                notes: notes.trim() || undefined,
              }),
            )
            onClose()
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field label="PC">
          <select
            className={inputCls}
            value={pcId}
            onChange={(e) => setPcId(e.target.value ? Number(e.target.value) : '')}
            required
          >
            <option value="">Select PC…</option>
            {state.pcs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.zone})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Registered customer (optional)">
          <select
            className={inputCls}
            value={customerId}
            onChange={(e) =>
              setCustomerId(e.target.value ? Number(e.target.value) : '')
            }
          >
            <option value="">Walk-in / name below</option>
            {state.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {customerId === '' && (
          <Field label="Customer name">
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ahmed"
              required
            />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date &amp; time">
            <input
              type="datetime-local"
              className={inputCls}
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              required
            />
          </Field>
          <Field label="Duration (min)">
            <input
              type="number"
              min={15}
              step={15}
              className={inputCls}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <input
            className={inputCls}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Birthday group, needs 2 seats together…"
          />
        </Field>
        <Btn variant="primary" disabled={busy} {...{ type: 'submit' }}>
          Create reservation
        </Btn>
      </form>
    </Modal>
  )
}
