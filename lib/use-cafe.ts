'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import type { ConsoleState } from './types'
import type { AnalyticsPayload } from '@/app/api/analytics/route'

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`)
    return r.json()
  })

export function useConsoleState() {
  const { data, error, isLoading, mutate } = useSWR<ConsoleState>(
    '/api/state',
    fetcher,
    { refreshInterval: 4000, keepPreviousData: true },
  )
  return { state: data, error, isLoading, refresh: mutate }
}

export function useAnalytics() {
  const { data, error, isLoading, mutate } = useSWR<AnalyticsPayload>(
    '/api/analytics',
    fetcher,
    { refreshInterval: 30_000, keepPreviousData: true },
  )
  return { analytics: data, error, isLoading, refresh: mutate }
}

/** Run a server action then refresh the shared console state. */
export async function withRefresh<T>(fn: () => Promise<T>): Promise<T> {
  const result = await fn()
  await Promise.all([
    globalMutate('/api/state'),
    globalMutate('/api/analytics'),
  ])
  return result
}
