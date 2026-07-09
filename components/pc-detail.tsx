'use client'

import { useState } from 'react'
import {
  Cookie,
  Lock,
  LockOpen,
  MessageSquare,
  Play,
  Power,
  RotateCcw,
  Square,
  Wifi,
  Wrench,
} from 'lucide-react'
import type {
  CheckoutResult,
  ConsoleState,
  Pc,
} from '@/lib/types'
import { formatDuration, formatMoney, isHappyHour } from '@/lib/billing'
import { liveCost, useNow } from './pc-tile'
import { Badge, Btn, Field, Modal, inputCls } from './ui-bits'
import { withRefresh } from '@/lib/use-cafe'
import {
  addOrder,
  endSession,
  messagePc,
  powerPc,
  setPcLock,
  setPcMaintenance,
  startSession,
  togglePcOnline,
} from '@/app/actions/cafe'

export function PcDetail({
  pc,
  state,
  onClose,
}: {
  pc: Pc
  state: ConsoleState
  onClose: () => void
}) {
  const now = useNow()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [snackId, setSnackId] = useState<number | ''>('')
  const [qty, setQty] = useState(1)
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [receipt, setReceipt] = useState<CheckoutResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { settings, customers, snacks } = state
  const session =
    state.activeSessions.find((s) => s.pcId === pc.id) ?? null
  const sessionOrders = session
    ? state.orders.filter(
        (o) => o.sessionId === session.id && o.status !== 'cancelled',
      )
    : []
  const live = session ? liveCost(pc, session, settings, now) : null
  const snackTotal = sessionOrders.reduce(
    (sum, o) => sum + o.quantity * o.unitPrice,
    0,
  )
  const customer = session?.customerId
    ? customers.find((c) => c.id === session.customerId)
    : null
  const happy = isHappyHour(settings)

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await withRefresh(fn)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleCheckout() {
    setBusy(true)
    setError(null)
    try {
      const result = await withRefresh(() => endSession(pc.id))
      if (result) setReceipt(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`${pc.name} — ${pc.zone.toUpperCase()}`} wide>
      <div className="flex flex-col gap-5">
        {/* Status row */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={
              pc.status === 'occupied'
                ? 'primary'
                : pc.status === 'offline'
                  ? 'destructive'
                  : 'success'
            }
          >
            {pc.status}
          </Badge>
          {pc.locked && <Badge tone="muted">Locked</Badge>}
          {pc.maintenance && <Badge tone="warning">Maintenance</Badge>}
          {happy && session && session.discountPercent > 0 && (
            <Badge tone="warning">Happy hour -{session.discountPercent}%</Badge>
          )}
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {pc.ipAddress} · {pc.hourlyRate.toFixed(0)} {settings.currency}/h
          </span>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Receipt view after checkout */}
        {receipt ? (
          <div className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
            <h3 className="text-sm font-bold text-success">Session complete</h3>
            <dl className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Billable time</dt>
                <dd className="font-mono">{formatDuration(receipt.seconds)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Time cost</dt>
                <dd className="font-mono">
                  {formatMoney(receipt.timeCost, settings.currency)}
                </dd>
              </div>
              {receipt.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="font-mono text-warning">
                    -{formatMoney(receipt.discount, settings.currency)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Snacks</dt>
                <dd className="font-mono">
                  {formatMoney(receipt.snackCost, settings.currency)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold">
                <dt>Total</dt>
                <dd className="font-mono text-success">
                  {formatMoney(receipt.total, settings.currency)}
                </dd>
              </div>
              {receipt.loyaltyEarned > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Loyalty earned</dt>
                  <dd className="font-mono text-primary">
                    +{receipt.loyaltyEarned} pts
                  </dd>
                </div>
              )}
            </dl>
            <Btn variant="primary" onClick={onClose}>
              Done
            </Btn>
          </div>
        ) : session && live ? (
          <>
            {/* Active session */}
            <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-end justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    Session time
                  </span>
                  <span className="font-mono text-3xl font-bold text-primary tabular-nums">
                    {formatDuration(live.seconds)}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    Running total
                  </span>
                  <span className="font-mono text-2xl font-bold tabular-nums">
                    {formatMoney(live.cost + snackTotal, settings.currency)}
                  </span>
                </div>
              </div>
              {customer && (
                <p className="text-sm text-muted-foreground">
                  Customer: <span className="font-medium text-foreground">{customer.name}</span>
                  {' · '}
                  {customer.loyaltyPoints} pts
                </p>
              )}
              {sessionOrders.length > 0 && (
                <ul className="flex flex-col gap-1 border-t border-border/60 pt-2 text-sm">
                  {sessionOrders.map((o) => (
                    <li key={o.id} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {o.quantity}x {o.itemName}
                      </span>
                      <span className="font-mono">
                        {formatMoney(o.quantity * o.unitPrice, settings.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Btn
                variant="destructive"
                disabled={busy}
                onClick={handleCheckout}
              >
                <Square className="size-4" aria-hidden="true" />
                End session &amp; checkout
              </Btn>
            </div>

            {/* Add snack order */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Add snack order
              </h3>
              <div className="flex gap-2">
                <select
                  className={inputCls}
                  value={snackId}
                  onChange={(e) =>
                    setSnackId(e.target.value ? Number(e.target.value) : '')
                  }
                  aria-label="Select snack"
                >
                  <option value="">Select item…</option>
                  {snacks
                    .filter((s) => s.active && s.stock > 0)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.price.toFixed(2)} ({s.stock} left)
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                  className={`${inputCls} w-20`}
                  aria-label="Quantity"
                />
                <Btn
                  variant="primary"
                  disabled={busy || snackId === ''}
                  onClick={() =>
                    run(async () => {
                      await addOrder(pc.id, snackId as number, qty)
                      setSnackId('')
                      setQty(1)
                    })
                  }
                >
                  <Cookie className="size-4" aria-hidden="true" />
                  Add
                </Btn>
              </div>
            </div>
          </>
        ) : (
          /* Idle: start session */
          <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
            <h3 className="text-sm font-bold">Start a session</h3>
            {happy && (
              <p className="text-xs text-warning">
                Happy hour is active — {settings.happyHourDiscountPercent}% off
                will be applied automatically.
              </p>
            )}
            <Field label="Customer (optional)">
              <select
                className={inputCls}
                value={customerId}
                onChange={(e) =>
                  setCustomerId(e.target.value ? Number(e.target.value) : '')
                }
              >
                <option value="">Walk-in</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.loyaltyPoints} pts)
                  </option>
                ))}
              </select>
            </Field>
            <Btn
              variant="success"
              disabled={busy || pc.status !== 'available' || pc.maintenance}
              onClick={() =>
                run(() =>
                  startSession(pc.id, customerId === '' ? null : customerId),
                )
              }
            >
              <Play className="size-4" aria-hidden="true" />
              Start session
            </Btn>
            {pc.maintenance && (
              <p className="text-xs text-warning">
                This PC is in maintenance mode. Disable it below to start sessions.
              </p>
            )}
          </div>
        )}

        {/* Remote controls */}
        {!receipt && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Remote controls
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Btn
                size="sm"
                disabled={busy || pc.status === 'offline'}
                onClick={() => run(() => setPcLock(pc.id, !pc.locked))}
              >
                {pc.locked ? (
                  <LockOpen className="size-3.5" aria-hidden="true" />
                ) : (
                  <Lock className="size-3.5" aria-hidden="true" />
                )}
                {pc.locked ? 'Unlock' : 'Lock'}
              </Btn>
              <Btn
                size="sm"
                disabled={busy || pc.status === 'occupied'}
                onClick={() => run(() => powerPc(pc.id, 'shutdown'))}
              >
                <Power className="size-3.5" aria-hidden="true" />
                Shutdown
              </Btn>
              <Btn
                size="sm"
                disabled={busy || pc.status === 'offline'}
                onClick={() => run(() => powerPc(pc.id, 'restart'))}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Restart
              </Btn>
              <Btn
                size="sm"
                disabled={busy || pc.status === 'occupied'}
                onClick={() => run(() => togglePcOnline(pc.id))}
              >
                <Wifi className="size-3.5" aria-hidden="true" />
                {pc.status === 'offline' ? 'Wake' : 'Set offline'}
              </Btn>
              <Btn
                size="sm"
                disabled={busy}
                onClick={() => run(() => setPcMaintenance(pc.id, !pc.maintenance))}
              >
                <Wrench className="size-3.5" aria-hidden="true" />
                {pc.maintenance ? 'End maint.' : 'Maintenance'}
              </Btn>
            </div>
            <div className="flex gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Send message to this PC…"
                className={inputCls}
                aria-label="Message to PC"
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.nativeEvent.isComposing &&
                    e.keyCode !== 229 &&
                    message.trim()
                  ) {
                    run(async () => {
                      await messagePc(pc.id, message.trim())
                      setMessage('')
                    })
                  }
                }}
              />
              <Btn
                size="sm"
                disabled={busy || !message.trim()}
                onClick={() =>
                  run(async () => {
                    await messagePc(pc.id, message.trim())
                    setMessage('')
                  })
                }
              >
                <MessageSquare className="size-3.5" aria-hidden="true" />
                Send
              </Btn>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
