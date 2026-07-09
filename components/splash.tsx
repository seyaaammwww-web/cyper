'use client'

import { useEffect, useState } from 'react'

const BOOT_LINES = [
  '> INITIALIZING COMMAND CONSOLE…',
  '> LINKING STATION NETWORK… OK',
  '> CALIBRATING TAC-MAP… OK',
  '> ALL SYSTEMS ONLINE',
] as const

export function Splash() {
  // null = undecided (avoids SSR flash), true = show, false = skip
  const [show, setShow] = useState<boolean | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [lineCount, setLineCount] = useState(0)

  useEffect(() => {
    if (sessionStorage.getItem('kazoza-splash-done')) {
      setShow(false)
      return
    }
    setShow(true)

    const lineTimers = BOOT_LINES.map((_, i) =>
      setTimeout(() => setLineCount(i + 1), 500 + i * 420),
    )
    const leaveTimer = setTimeout(() => setLeaving(true), 2600)
    const doneTimer = setTimeout(() => {
      sessionStorage.setItem('kazoza-splash-done', '1')
      setShow(false)
    }, 3150)

    return () => {
      lineTimers.forEach(clearTimeout)
      clearTimeout(leaveTimer)
      clearTimeout(doneTimer)
    }
  }, [])

  if (!show) return null

  return (
    <div
      aria-hidden="true"
      className={`splash-root fixed inset-0 z-100 flex flex-col items-center justify-center gap-8 bg-background px-6 ${
        leaving ? 'splash-leave' : ''
      }`}
    >
      {/* Backdrop grid + sweeping scanline */}
      <div className="art-backdrop" style={{ zIndex: -1 }} />
      <div className="scan-sheen" />

      {/* Wordmark in a HUD target frame */}
      <div className="hud-brackets flex flex-col items-center gap-2 px-8 py-6 sm:px-14 sm:py-8">
        <h1 className="splash-word flex gap-[0.08em] text-4xl font-bold uppercase leading-none tracking-[0.12em] text-foreground sm:text-6xl">
          {'KAZOZA'.split('').map((ch, i) => (
            <span
              key={i}
              className="splash-letter"
              style={{ animationDelay: `${120 + i * 90}ms` }}
            >
              {ch}
            </span>
          ))}
        </h1>
        <p className="splash-sub font-mono text-[11px] font-semibold uppercase tracking-[0.5em] text-primary sm:text-sm">
          Gaming Center
        </p>
      </div>

      {/* Boot log */}
      <div className="flex h-20 w-full max-w-xs flex-col gap-1" role="presentation">
        {BOOT_LINES.slice(0, lineCount).map((line, i) => (
          <p
            key={line}
            className={`font-mono text-[10px] uppercase tracking-wider ${
              i === BOOT_LINES.length - 1 ? 'text-success' : 'text-muted-foreground'
            }`}
          >
            {line}
          </p>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full max-w-xs overflow-hidden bg-muted">
        <div className="splash-progress h-full bg-primary" />
      </div>
    </div>
  )
}
