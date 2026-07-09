'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { useConsoleState, withRefresh } from '@/lib/use-cafe'
import { updateSettings } from '@/app/actions/cafe'
import type { Settings } from '@/lib/types'
import { Btn, Card, Field, SectionTitle, inputCls } from './ui-bits'

export function SettingsView() {
  const { state } = useConsoleState()
  const [form, setForm] = useState<Settings | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (state && !form) setForm(state.settings)
  }, [state, form])

  if (!state || !form) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f))
    setSaved(false)
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle
        title="Settings"
        subtitle="Billing rules, happy hour, and loyalty configuration. Changes apply to new sessions."
      />

      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try {
            await withRefresh(() => updateSettings(form))
            setSaved(true)
          } finally {
            setBusy(false)
          }
        }}
      >
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-sm font-bold">General</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cafe name">
              <input
                className={inputCls}
                value={form.cafeName}
                onChange={(e) => set('cafeName', e.target.value)}
              />
            </Field>
            <Field label="Currency">
              <input
                className={inputCls}
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-sm font-bold">Billing rules</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Offline grace (sec)">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.offlineGraceSeconds}
                onChange={(e) => set('offlineGraceSeconds', Number(e.target.value))}
              />
            </Field>
            <Field label="Minimum session (min)">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.minimumSessionMinutes}
                onChange={(e) =>
                  set('minimumSessionMinutes', Number(e.target.value))
                }
              />
            </Field>
            <Field label="Rounding">
              <select
                className={inputCls}
                value={form.billingRounding}
                onChange={(e) =>
                  set('billingRounding', e.target.value as Settings['billingRounding'])
                }
              >
                <option value="none">Exact</option>
                <option value="5min">Round up to 5 min</option>
                <option value="15min">Round up to 15 min</option>
              </select>
            </Field>
            <Field label="Tax (%)">
              <input
                type="number"
                min={0}
                step="0.5"
                className={inputCls}
                value={form.taxPercent}
                onChange={(e) => set('taxPercent', Number(e.target.value))}
              />
            </Field>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Happy hour</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.happyHourEnabled}
                onChange={(e) => set('happyHourEnabled', e.target.checked)}
                className="size-4 accent-primary"
              />
              Enabled
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Start hour (0-23)">
              <input
                type="number"
                min={0}
                max={23}
                className={inputCls}
                value={form.happyHourStart}
                onChange={(e) => set('happyHourStart', Number(e.target.value))}
                disabled={!form.happyHourEnabled}
              />
            </Field>
            <Field label="End hour (0-23)">
              <input
                type="number"
                min={0}
                max={23}
                className={inputCls}
                value={form.happyHourEnd}
                onChange={(e) => set('happyHourEnd', Number(e.target.value))}
                disabled={!form.happyHourEnabled}
              />
            </Field>
            <Field label="Discount (%)">
              <input
                type="number"
                min={0}
                max={100}
                className={inputCls}
                value={form.happyHourDiscountPercent}
                onChange={(e) =>
                  set('happyHourDiscountPercent', Number(e.target.value))
                }
                disabled={!form.happyHourEnabled}
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Sessions started inside the happy-hour window automatically get the
            discount applied at checkout. Overnight windows (e.g. 22 to 2) are
            supported.
          </p>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-sm font-bold">Loyalty</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Points earned per 1 ${form.currency} spent`}>
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputCls}
                value={form.loyaltyPointsPerCurrency}
                onChange={(e) =>
                  set('loyaltyPointsPerCurrency', Number(e.target.value))
                }
              />
            </Field>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <Btn variant="primary" disabled={busy} {...{ type: 'submit' }}>
            <Save className="size-4" aria-hidden="true" />
            Save settings
          </Btn>
          {saved && (
            <span className="text-sm text-success">Saved successfully.</span>
          )}
        </div>
      </form>
    </div>
  )
}
