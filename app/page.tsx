'use client'

import { useState } from 'react'
import { BarChart3, Cookie, LayoutGrid, Zap } from 'lucide-react'
import { CafeProvider, useCafe } from '@/lib/store'
import { Dashboard } from '@/components/dashboard'
import { SnackOrders } from '@/components/snack-orders'
import { Statistics } from '@/components/statistics'

type Tab = 'dashboard' | 'orders' | 'stats'

export default function Page() {
  return (
    <CafeProvider>
      <Shell />
    </CafeProvider>
  )
}

function Shell() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const { settings, orders } = useCafe()
  const pendingCount = orders.filter((o) => o.status === 'pending').length

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid className="size-4" aria-hidden="true" /> },
    { id: 'orders', label: 'Snack Orders', icon: <Cookie className="size-4" aria-hidden="true" /> },
    { id: 'stats', label: 'Statistics', icon: <BarChart3 className="size-4" aria-hidden="true" /> },
  ]

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="size-4 text-primary-foreground" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold leading-tight">{settings.cafeName}</h1>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Manager Console · Web Demo
            </span>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-success">
          <span className="size-1.5 animate-pulse rounded-full bg-success" />
          Server running
        </span>
      </header>

      <nav className="flex gap-1 border-b border-border px-4 pt-2 sm:px-6" aria-label="Sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`relative flex items-center gap-1.5 rounded-t-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sr-only sm:hidden">{t.label}</span>
            {t.id === 'orders' && pendingCount > 0 && (
              <span className="flex size-4.5 items-center justify-center rounded-full bg-warning font-mono text-[10px] font-bold text-background">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main className="flex-1 px-4 py-6 sm:px-6">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'orders' && <SnackOrders />}
        {tab === 'stats' && <Statistics />}
      </main>

      <footer className="border-t border-border px-4 py-3 sm:px-6">
        <p className="text-pretty text-xs leading-relaxed text-muted-foreground">
          This is a visual web replica of the real Cyper system (Flutter Manager App + Windows
          client + cloud relay). Timers, billing rules (minimum {settings.minimumSessionMinutes}{' '}
          min, {settings.billingRounding} rounding, {settings.offlineGraceSeconds}s offline grace)
          and snack workflows match the production logic.
        </p>
      </footer>
    </div>
  )
}
