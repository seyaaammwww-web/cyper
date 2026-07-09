'use client'

import { useState } from 'react'
import { Plus, Search, User, Wallet } from 'lucide-react'
import { useConsoleState, withRefresh } from '@/lib/use-cafe'
import { addCustomer, topUpCustomer } from '@/app/actions/cafe'
import type { Customer } from '@/lib/types'
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

export function CustomersView() {
  const { state } = useConsoleState()
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [topUpFor, setTopUpFor] = useState<Customer | null>(null)

  if (!state) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />
  }

  const currency = state.settings.currency
  const q = query.trim().toLowerCase()
  const filtered = state.customers.filter(
    (c) =>
      q === '' ||
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q),
  )

  const activeCustomerIds = new Set(
    state.activeSessions
      .map((s) => s.customerId)
      .filter((id): id is number => id != null),
  )

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle
        title="Customers"
        subtitle="Profiles with prepaid balance, loyalty points, and visit history."
        actions={
          <Btn size="sm" variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" aria-hidden="true" />
            Add customer
          </Btn>
        }
      />

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          className={`${inputCls} pl-9`}
          placeholder="Search by name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search customers"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No customers found." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-muted">
                    <User className="size-4 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{c.name}</span>
                    {c.phone && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {c.phone}
                      </span>
                    )}
                  </div>
                </div>
                {activeCustomerIds.has(c.id) && (
                  <Badge tone="success">Playing now</Badge>
                )}
              </div>

              <dl className="grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col rounded-lg bg-muted/60 px-2 py-1.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Prepaid
                  </dt>
                  <dd className="font-mono text-sm font-bold text-success">
                    {c.prepaidBalance.toFixed(0)}
                  </dd>
                </div>
                <div className="flex flex-col rounded-lg bg-muted/60 px-2 py-1.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Points
                  </dt>
                  <dd className="font-mono text-sm font-bold text-primary">
                    {c.loyaltyPoints}
                  </dd>
                </div>
                <div className="flex flex-col rounded-lg bg-muted/60 px-2 py-1.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Visits
                  </dt>
                  <dd className="font-mono text-sm font-bold">{c.visitCount}</dd>
                </div>
              </dl>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Lifetime: {c.totalSpent.toFixed(0)} {currency}
                </span>
                <Btn size="sm" onClick={() => setTopUpFor(c)}>
                  <Wallet className="size-3.5" aria-hidden="true" />
                  Top up
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {addOpen && <AddCustomerModal onClose={() => setAddOpen(false)} />}
      {topUpFor && (
        <TopUpModal
          customer={topUpFor}
          currency={currency}
          onClose={() => setTopUpFor(null)}
        />
      )}
    </div>
  )
}

function AddCustomerModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <Modal open onClose={onClose} title="Add customer">
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          setBusy(true)
          try {
            await withRefresh(() =>
              addCustomer({
                name: name.trim(),
                phone: phone.trim() || undefined,
                notes: notes.trim() || undefined,
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
        <Field label="Phone (optional)">
          <input
            className={inputCls}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+20 1xx xxx xxxx"
          />
        </Field>
        <Field label="Notes (optional)">
          <input
            className={inputCls}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <Btn variant="primary" disabled={busy} {...{ type: 'submit' }}>
          Add customer
        </Btn>
      </form>
    </Modal>
  )
}

function TopUpModal({
  customer,
  currency,
  onClose,
}: {
  customer: Customer
  currency: string
  onClose: () => void
}) {
  const [amount, setAmount] = useState(50)
  const [busy, setBusy] = useState(false)

  return (
    <Modal open onClose={onClose} title={`Top up ${customer.name}`}>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          if (amount <= 0) return
          setBusy(true)
          try {
            await withRefresh(() => topUpCustomer(customer.id, amount))
            onClose()
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="text-sm text-muted-foreground">
          Current balance:{' '}
          <span className="font-mono font-semibold text-success">
            {customer.prepaidBalance.toFixed(2)} {currency}
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[25, 50, 100, 200].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(v)}
              className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                amount === v
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              +{v}
            </button>
          ))}
        </div>
        <Field label={`Amount (${currency})`}>
          <input
            type="number"
            min={1}
            className={inputCls}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </Field>
        <Btn variant="primary" disabled={busy || amount <= 0} {...{ type: 'submit' }}>
          Add {amount.toFixed(0)} {currency}
        </Btn>
      </form>
    </Modal>
  )
}
