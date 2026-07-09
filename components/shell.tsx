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
      {/* Fixed artwork backdrop behind everything */}
      <div className="art-backdrop" aria-hidden="true" />

      {/* Desktop sidebar */}
      <aside className="glass-deep sticky top-0 hidden h-dvh w-56 flex-col border-r border-border md:flex">
        <div className="flex flex-col items-center gap-2 border-b border-border px-4 py-4">
          <Image
            src="/images/kazoza-logo.jpg"
            alt="Kazoza Gaming Center logo"
            width={180}
            height={180}
            className="clip-plate w-full border border-border grayscale-[45%] transition-all hover:grayscale-0"
            priority
          />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-primary">
            [ COMMAND CONSOLE ]
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
                className={`flex items-center gap-2.5 border-l-2 px-3 py-2 text-sm font-semibold uppercase tracking-wider transition-all ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {count > 0 && (
                  <span className="clip-plate flex size-5 items-center justify-center bg-warning font-mono text-[10px] font-bold text-warning-foreground">
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="flex flex-col gap-2 border-t border-border p-4">
          {happy && (
            <span className="flex items-center gap-1.5 border border-warning/40 bg-warning/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-warning">
              <span className="size-1.5 bg-warning" />
              XP boost // Happy hour
            </span>
          )}
          <span className="flex items-center gap-1.5 border border-success/40 bg-success/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-success">
            <span className="size-1.5 animate-pulse bg-success" />
            Sys online
          </span>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="glass sticky top-0 z-40 flex items-center justify-between border-b px-4 py-2.5 md:hidden">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/kazoza-logo.jpg"
              alt="Kazoza Gaming Center logo"
              width={36}
              height={36}
              className="size-9 border border-border object-cover grayscale-[35%]"
              priority
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold uppercase leading-tight tracking-wider text-primary">
                {state?.settings.cafeName ?? 'Kazoza'}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                [ COMMAND CONSOLE ]
              </span>
            </div>
          </div>
          <span className="flex items-center gap-1.5 border border-success/40 bg-success/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-success">
            <span className="size-1.5 animate-pulse bg-success" />
            Live
          </span>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 sm:px-6 md:pb-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav
          className="glass-deep fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border px-1 py-1.5 md:hidden"
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
                className={`relative flex flex-col items-center gap-0.5 border-t-2 px-2 py-1.5 text-[10px] font-medium ${
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground'
                }`}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="sr-only">{label}</span>
                {count > 0 && (
                  <span className="absolute -top-0.5 right-0 flex size-4 items-center justify-center bg-warning font-mono text-[9px] font-bold text-warning-foreground">
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
