'use client'

import { useState } from 'react'
import { Check, Cookie, Plus, X } from 'lucide-react'
import { useConsoleState, withRefresh } from '@/lib/use-cafe'
import { setOrderStatus, upsertSnack } from '@/app/actions/cafe'
import type { OrderStatus, Snack } from '@/lib/types'
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

export function OrdersBoard() {
  const { state, isLoading } = useConsoleState()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Snack | 'new' | null>(null)

  if (isLoading || !state) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />
  }

  const pcName = (id: number) =>
    state.pcs.find((p) => p.id === id)?.name ?? `PC #${id}`

  const pending = state.orders.filter((o) => o.status === 'pending')
  const done = state.orders.filter((o) => o.status !== 'pending').slice(0, 20)
  const lowStock = state.snacks.filter(
    (s) => s.active && s.stock <= s.lowStockThreshold,
  )

  async function move(orderId: number, status: OrderStatus) {
    setBusy(true)
    try {
      await withRefresh(() => setOrderStatus(orderId, status))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        title="Snack orders"
        subtitle="Pending orders across all PCs, plus menu and stock management."
        actions={
          <Btn size="sm" variant="primary" onClick={() => setEditing('new')}>
            <Plus className="size-3.5" aria-hidden="true" />
            Add item
          </Btn>
        }
      />

      {lowStock.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-sm text-warning">
            Low stock:{' '}
            {lowStock.map((s) => `${s.name} (${s.stock})`).join(', ')}
          </p>
        </div>
      )}

      {/* Pending queue */}
      <section className="flex flex-col gap-2.5">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <EmptyState message="No pending orders. Orders placed from the dashboard appear here." />
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((o) => (
              <Card key={o.id} className="flex items-center gap-3 p-3.5">
                <Cookie className="size-4 shrink-0 text-warning" aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {o.quantity}x {o.itemName}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {pcName(o.pcId)} ·{' '}
                    {(o.quantity * o.unitPrice).toFixed(2)}{' '}
                    {state.settings.currency}
                  </span>
                </div>
                <Btn
                  size="sm"
                  variant="success"
                  disabled={busy}
                  onClick={() => move(o.id, 'delivered')}
                >
                  <Check className="size-3.5" aria-hidden="true" />
                  Deliver
                </Btn>
                <Btn
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => move(o.id, 'cancelled')}
                  aria-label={`Cancel order ${o.itemName}`}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </Btn>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Menu / inventory */}
      <section className="flex flex-col gap-2.5">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Menu &amp; stock
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {state.snacks.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setEditing(s)}
              className={`flex flex-col gap-1.5 rounded-xl border p-3.5 text-left transition-colors hover:border-primary ${
                s.active ? 'border-border bg-card' : 'border-border bg-muted opacity-60'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-sm font-medium">{s.name}</span>
                {!s.active && <Badge tone="muted">Hidden</Badge>}
              </div>
              <span className="font-mono text-lg font-bold">
                {s.price.toFixed(2)}
              </span>
              <span
                className={`font-mono text-xs ${
                  s.stock <= s.lowStockThreshold
                    ? 'text-warning'
                    : 'text-muted-foreground'
                }`}
              >
                {s.stock} in stock
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Recent history */}
      {done.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Recent
          </h2>
          <Card className="divide-y divide-border">
            {done.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 truncate text-sm text-muted-foreground">
                  {o.quantity}x {o.itemName} · {pcName(o.pcId)}
                </span>
                <Badge tone={o.status === 'delivered' ? 'success' : 'destructive'}>
                  {o.status}
                </Badge>
              </div>
            ))}
          </Card>
        </section>
      )}

      {editing && (
        <SnackEditor
          snack={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function SnackEditor({
  snack,
  onClose,
}: {
  snack: Snack | null
  onClose: () => void
}) {
  const [name, setName] = useState(snack?.name ?? '')
  const [price, setPrice] = useState(snack?.price ?? 10)
  const [stock, setStock] = useState(snack?.stock ?? 0)
  const [threshold, setThreshold] = useState(snack?.lowStockThreshold ?? 5)
  const [active, setActive] = useState(snack?.active ?? true)
  const [busy, setBusy] = useState(false)

  return (
    <Modal open onClose={onClose} title={snack ? `Edit ${snack.name}` : 'Add menu item'}>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          setBusy(true)
          try {
            await withRefresh(() =>
              upsertSnack({
                id: snack?.id,
                name: name.trim(),
                price,
                stock,
                lowStockThreshold: threshold,
                active,
              }),
            )
            onClose()
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field label="Name">
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Price">
            <input
              type="number"
              min={0}
              step="0.5"
              className={inputCls}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </Field>
          <Field label="Stock">
            <input
              type="number"
              min={0}
              className={inputCls}
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
            />
          </Field>
          <Field label="Low alert">
            <input
              type="number"
              min={0}
              className={inputCls}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4 accent-primary"
          />
          Visible on menu
        </label>
        <Btn variant="primary" disabled={busy} {...{ type: 'submit' }}>
          {snack ? 'Save changes' : 'Add item'}
        </Btn>
      </form>
    </Modal>
  )
}
