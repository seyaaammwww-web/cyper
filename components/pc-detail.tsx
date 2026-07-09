'use client'

import { useState } from 'react'
import {
  Lock,
  LockOpen,
  MessageSquare,
  Moon,
  Play,
  Power,
  Receipt,
  RotateCcw,
  ShoppingCart,
  X,
} from 'lucide-react'
import {
  SNACK_MENU,
  computeBillableSeconds,
  computeTimeCost,
  formatDuration,
  formatMoney,
  type Pc,
} from '@/lib/demo-data'
import { useCafe } from '@/lib/store'

interface CheckoutResult {
  timeCost: number
  snackCost: number
  total: number
  seconds: number
}

export function PcDetail({ pc, onClose }: { pc: Pc; onClose: () => void }) {
  const {
    sessions,
    orders,
    settings,
    startSession,
    endSession,
    addOrder,
    togglePcOnline,
    isLocked,
    lockPc,
    unlockPc,
    powerPc,
    messagePc,
  } = useCafe()
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const locked = isLocked(pc.id)

  function flash(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2200)
  }

  function handleMessage() {
    const message = window.prompt(`Send a message to ${pc.name}:`)
    if (message && message.trim()) {
      messagePc(pc.id, message.trim())
      flash(`Message sent to ${pc.name}`)
    }
  }

  function handlePower(action: 'shutdown' | 'restart' | 'sleep') {
    const ok = window.confirm(`${action[0].toUpperCase() + action.slice(1)} ${pc.name}?`)
    if (ok) {
      powerPc(pc.id, action)
      flash(`${action} command sent to ${pc.name}`)
    }
  }

  const session = sessions.find((s) => s.pcId === pc.id && s.status === 'active')
  const sessionOrders = session
    ? orders.filter((o) => o.sessionId === session.id && o.status !== 'cancelled')
    : []
  const snackTotal = sessionOrders.reduce((sum, o) => sum + o.quantity * o.unitPrice, 0)

  const rawSeconds = session ? Math.floor((Date.now() - session.startTime) / 1000) : 0
  const billable = session
    ? computeBillableSeconds(rawSeconds, session.offlineSeconds, settings)
    : 0
  const liveCost = session ? computeTimeCost(billable, pc.hourlyRate, settings) : 0

  function handleEnd() {
    const result = endSession(pc.id)
    if (result) setCheckout(result)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${pc.name} details`}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-5 rounded-xl border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-lg font-bold">{pc.name}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {checkout ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-success">
              <Receipt className="size-5" aria-hidden="true" />
              <span className="font-semibold">Session complete — Receipt</span>
            </div>
            <dl className="flex flex-col gap-2 rounded-lg bg-muted p-4 font-mono text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Billed time</dt>
                <dd>{formatDuration(checkout.seconds)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Time cost</dt>
                <dd>{formatMoney(checkout.timeCost, settings.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Snacks</dt>
                <dd>{formatMoney(checkout.snackCost, settings.currency)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd className="text-success">{formatMoney(checkout.total, settings.currency)}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        ) : session ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-1 rounded-lg bg-muted p-4">
              <span className="font-mono text-3xl font-bold text-success tabular-nums">
                {formatDuration(rawSeconds)}
              </span>
              <span className="font-mono text-sm text-muted-foreground">
                Live cost: {formatMoney(liveCost, settings.currency)}
                {snackTotal > 0 && ` + ${formatMoney(snackTotal, settings.currency)} snacks`}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <ShoppingCart className="size-4" aria-hidden="true" />
                Add snack order
              </span>
              <div className="grid grid-cols-2 gap-2">
                {SNACK_MENU.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => addOrder(pc.id, item.name, 1, item.price)}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm hover:border-primary/60"
                  >
                    <span>{item.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{item.price}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleEnd}
              className="rounded-lg bg-destructive px-4 py-2.5 font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              End session &amp; checkout
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {pc.status === 'offline'
                ? 'This PC is offline (no heartbeat received). In the real system the client app sends a heartbeat every 30 seconds.'
                : `Ready to start a session at ${pc.hourlyRate} ${settings.currency}/hour.`}
            </p>
            {pc.status === 'available' && (
              <button
                type="button"
                onClick={() => startSession(pc.id)}
                className="flex items-center justify-center gap-2 rounded-lg bg-success px-4 py-2.5 font-semibold text-success-foreground hover:bg-success/90"
              >
                <Play className="size-4" aria-hidden="true" />
                Start session
              </button>
            )}
            {(pc.status === 'offline' || pc.status === 'available') && (
              <button
                type="button"
                onClick={() => togglePcOnline(pc.id)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Simulate {pc.status === 'offline' ? 'reconnect' : 'going offline'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
