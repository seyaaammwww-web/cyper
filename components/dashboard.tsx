'use client'

import { useMemo, useState } from 'react'
import { Check, Lock, Move, Plus } from 'lucide-react'
import type { Pc } from '@/lib/types'
import { useConsoleState, withRefresh } from '@/lib/use-cafe'
import { addPc, lockAllPcs } from '@/app/actions/cafe'
import { liveCost, useNow } from './pc-tile'
import { CafeMap } from './cafe-map'
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

export function Dashboard() {
  const { state, isLoading, error } = useConsoleState()
  const now = useNow()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'occupied' | 'available' | 'offline'>('all')
  const [busy, setBusy] = useState(false)
  const [editingHall, setEditingHall] = useState(false)

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
      <EmptyState message="مش قادر أوصل للسيرفر — اتأكد من النت وجرّب تاني" />
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

  const sessionFor = (pc: Pc) =>
    state.activeSessions.find((s) => s.pcId === pc.id) ?? null
  const pendingFor = (pc: Pc) =>
    state.orders.filter((o) => o.pcId === pc.id && o.status === 'pending').length

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle
        title="لوحة الأجهزة"
        subtitle="حالة كل جهاز لايف، عدادات الوقت، والحساب الشغّال دلوقتي."
        actions={
          <>
            <Btn
              size="sm"
              variant={editingHall ? 'primary' : 'outline'}
              onClick={() => setEditingHall((v) => !v)}
            >
              {editingHall ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                <Move className="size-3.5" aria-hidden="true" />
              )}
              {editingHall ? 'خلصت' : 'عدّل القاعة'}
            </Btn>
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
              اقفل الفاضي
            </Btn>
            <Btn size="sm" variant="primary" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5" aria-hidden="true" />
              أضف جهاز
            </Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="شغّال دلوقتي"
          value={String(stats.occupied)}
          tone="primary"
          hint={`من ${state.pcs.length} جهاز`}
        />
        <StatCard label="فاضي" value={String(stats.available)} tone="success" />
        <StatCard
          label="مقطوع"
          value={String(stats.offline)}
          tone={stats.offline > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="الحساب الشغّال"
          value={`${stats.running.toFixed(2)}`}
          hint={`${state.settings.currency} · وقت + طلبات`}
          tone="success"
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="فلترة الأجهزة">
        {(
          [
            ['all', 'الكل'],
            ['occupied', 'شغّال'],
            ['available', 'فاضي'],
            ['offline', 'مقطوع'],
          ] as const
        ).map(([f, label]) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`clip-plate border px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {state.pcs.length === 0 ? (
        <EmptyState message="مفيش أجهزة لسه — أضف أول جهاز عشان يظهر على الخريطة" />
      ) : (
        <CafeMap
          pcs={state.pcs}
          sessionFor={sessionFor}
          pendingFor={pendingFor}
          settings={state.settings}
          filter={filter}
          editing={editingHall}
          onSelect={(id) => setSelectedId(id)}
        />
      )}

      {selectedPc && (
        <PcDetail pc={selectedPc} state={state} onClose={() => setSelectedId(null)} />
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="أضف جهاز جديد">
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
          <Field label="اسم الجهاز">
            <input
              className={inputCls}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="PC-14"
              required
            />
          </Field>
          <Field label="المنطقة">
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
          <Field label="سعر الساعة">
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
            أضف الجهاز
          </Btn>
        </form>
      </Modal>
    </div>
  )
}
