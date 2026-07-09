'use client'

import { useState } from 'react'
import { type Pc } from '@/lib/demo-data'
import { useCafe } from '@/lib/store'
import { PcTile } from './pc-tile'
import { PcDetail } from './pc-detail'

export function Dashboard() {
  const { pcs } = useCafe()
  const [selected, setSelected] = useState<Pc | null>(null)

  const occupied = pcs.filter((p) => p.status === 'occupied').length
  const available = pcs.filter((p) => p.status === 'available').length
  const offline = pcs.filter((p) => p.status === 'offline').length

  // Keep the selected PC object fresh from state
  const selectedPc = selected ? pcs.find((p) => p.id === selected.id) ?? null : null

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="In session" value={occupied} tone="text-success" />
        <StatCard label="Available" value={available} tone="text-foreground" />
        <StatCard label="Offline" value={offline} tone="text-destructive" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {pcs.map((pc) => (
          <PcTile key={pc.id} pc={pc} onSelect={setSelected} />
        ))}
      </div>

      {selectedPc && <PcDetail pc={selectedPc} onClose={() => setSelected(null)} />}
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono text-2xl font-bold ${tone}`}>{value}</span>
    </div>
  )
}
