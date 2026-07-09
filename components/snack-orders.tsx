'use client'

import { Check, Clock, XCircle } from 'lucide-react'
import { formatMoney } from '@/lib/demo-data'
import { useCafe } from '@/lib/store'

export function SnackOrders() {
  const { orders, pcs, settings, setOrderStatus } = useCafe()

  const pending = orders.filter((o) => o.status === 'pending')
  const done = orders.filter((o) => o.status !== 'pending')

  function pcName(pcId: number) {
    return pcs.find((p) => p.id === pcId)?.name ?? `PC-${pcId}`
  }

  function timeAgo(ts: number) {
    const mins = Math.floor((Date.now() - ts) / 60_000)
    if (mins < 1) return 'just now'
    if (mins === 1) return '1 min ago'
    return `${mins} mins ago`
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="pending-heading" className="flex flex-col gap-3">
        <h2 id="pending-heading" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="size-4 text-warning" aria-hidden="true" />
          Pending ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No pending orders. Open an occupied PC on the dashboard to place one.
          </p>
        )}
        {pending.map((order) => (
          <div
            key={order.id}
            className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">
                {order.quantity}x {order.itemName}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {pcName(order.pcId)} · {timeAgo(order.createdAt)} ·{' '}
                {formatMoney(order.quantity * order.unitPrice, settings.currency)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOrderStatus(order.id, 'delivered')}
                className="flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-sm font-semibold text-success-foreground hover:bg-success/90"
              >
                <Check className="size-4" aria-hidden="true" />
                Deliver
              </button>
              <button
                type="button"
                onClick={() => setOrderStatus(order.id, 'cancelled')}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
              >
                <XCircle className="size-4" aria-hidden="true" />
                Cancel
              </button>
            </div>
          </div>
        ))}
      </section>

      <section aria-labelledby="history-heading" className="flex flex-col gap-3">
        <h2 id="history-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          History
        </h2>
        {done.map((order) => (
          <div
            key={order.id}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 opacity-70"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm">
                {order.quantity}x {order.itemName}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {pcName(order.pcId)} · {timeAgo(order.createdAt)}
              </span>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-xs ${
                order.status === 'delivered'
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {order.status}
            </span>
          </div>
        ))}
      </section>
    </div>
  )
}
