'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Activity,
  BarChart3,
  CalendarClock,
  Cookie,
  LayoutGrid,
  Settings,
  Users,
} from 'lucide-react'
import { useConsoleState } from '@/lib/use-cafe'
import { isHappyHour } from '@/lib/billing'

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  { href: '/orders', label: 'Orders', icon: Cookie },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/reservations', label: 'Reservations', icon: CalendarClock },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { state } = useConsoleState()

  const pendingOrders =
    state?.orders.filter((o) => o.status === 'pending').length ?? 0
  const upcomingReservations =
    state?.reservations.filter((r) => r.status === 'upcoming').length ?? 0
  const happy = state ? isHappyHour(state.settings) : false

  const badge = (href: string) =>
    href === '/orders'
      ? pendingOrders
      : href === '/reservations'
        ? upcomingReservations
        : 0

  return (
    <div className="flex min-h-dvh w-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-56 flex-col border-r border-border bg-card md:flex">
        <div className="flex flex-col items-center gap-2 border-b border-border px-4 py-4">
          <Image
            src="/images/kazoza-logo.jpg"
            alt="Kazoza Gaming Center logo"
            width={180}
            height={180}
            className="w-full rounded-xl border border-primary/30 neon-ring"
            priority
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent neon-text-cyan">
            Ops Console
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            const count = badge(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? 'bg-primary/15 text-primary neon-text'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {count > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-warning font-mono text-[10px] font-bold text-warning-foreground">
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="flex flex-col gap-2 border-t border-border p-4">
          {happy && (
            <span className="flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-warning">
              <span className="size-1.5 rounded-full bg-warning" />
              Happy hour active
            </span>
          )}
          <span className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-success">
            <span className="size-1.5 animate-pulse rounded-full bg-success" />
            Server running
          </span>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-2.5 backdrop-blur md:hidden">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/kazoza-logo.jpg"
              alt="Kazoza Gaming Center logo"
              width={36}
              height={36}
              className="size-9 rounded-lg border border-primary/40 object-cover neon-ring"
              priority
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight text-primary neon-text">
                {state?.settings.cafeName ?? 'Kazoza'}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
                Ops Console
              </span>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-success">
            <span className="size-1.5 animate-pulse rounded-full bg-success" />
            Live
          </span>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 sm:px-6 md:pb-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-card/95 px-1 py-1.5 backdrop-blur md:hidden"
          aria-label="Main"
        >
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            const count = badge(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium ${
                  active ? 'text-primary neon-text' : 'text-muted-foreground'
                }`}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="sr-only">{label}</span>
                {count > 0 && (
                  <span className="absolute -top-0.5 right-0 flex size-4 items-center justify-center rounded-full bg-warning font-mono text-[9px] font-bold text-warning-foreground">
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
