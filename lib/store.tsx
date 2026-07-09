'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  DEFAULT_SETTINGS,
  SEED_ORDERS,
  SEED_PCS,
  SEED_SESSIONS,
  computeBillableSeconds,
  computeTimeCost,
  type Pc,
  type Session,
  type Settings,
  type SnackOrder,
} from './demo-data'

interface CafeState {
  pcs: Pc[]
  sessions: Session[]
  orders: SnackOrder[]
  settings: Settings
  tick: number
  startSession: (pcId: number) => void
  endSession: (pcId: number) => { timeCost: number; snackCost: number; total: number; seconds: number } | null
  addOrder: (pcId: number, itemName: string, quantity: number, unitPrice: number) => void
  setOrderStatus: (orderId: number, status: SnackOrder['status']) => void
  togglePcOnline: (pcId: number) => void
}

const CafeContext = createContext<CafeState | null>(null)

let nextId = 1000

export function CafeProvider({ children }: { children: React.ReactNode }) {
  const [pcs, setPcs] = useState<Pc[]>(SEED_PCS)
  const [sessions, setSessions] = useState<Session[]>(SEED_SESSIONS)
  const [orders, setOrders] = useState<SnackOrder[]>(SEED_ORDERS)
  const [settings] = useState<Settings>(DEFAULT_SETTINGS)
  const [tick, setTick] = useState(0)

  // 1-second tick drives live timers, like heartbeats in the real system.
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const startSession = useCallback((pcId: number) => {
    setSessions((prev) => [
      ...prev,
      {
        id: ++nextId,
        pcId,
        startTime: Date.now(),
        offlineSeconds: 0,
        status: 'active',
      },
    ])
    setPcs((prev) =>
      prev.map((p) => (p.id === pcId ? { ...p, status: 'occupied' } : p)),
    )
  }, [])

  const endSession = useCallback(
    (pcId: number) => {
      const session = sessions.find(
        (s) => s.pcId === pcId && s.status === 'active',
      )
      if (!session) return null
      const pc = pcs.find((p) => p.id === pcId)
      if (!pc) return null

      const rawSeconds = Math.floor((Date.now() - session.startTime) / 1000)
      const billable = computeBillableSeconds(
        rawSeconds,
        session.offlineSeconds,
        settings,
      )
      const timeCost = computeTimeCost(billable, pc.hourlyRate, settings)
      const snackCost = orders
        .filter((o) => o.sessionId === session.id && o.status !== 'cancelled')
        .reduce((sum, o) => sum + o.quantity * o.unitPrice, 0)

      setSessions((prev) =>
        prev.map((s) =>
          s.id === session.id
            ? {
                ...s,
                status: 'completed',
                endTime: Date.now(),
                timeCost,
                snackCost,
              }
            : s,
        ),
      )
      setPcs((prev) =>
        prev.map((p) => (p.id === pcId ? { ...p, status: 'available' } : p)),
      )
      return { timeCost, snackCost, total: timeCost + snackCost, seconds: billable }
    },
    [sessions, pcs, orders, settings],
  )

  const addOrder = useCallback(
    (pcId: number, itemName: string, quantity: number, unitPrice: number) => {
      const session = sessions.find(
        (s) => s.pcId === pcId && s.status === 'active',
      )
      if (!session) return
      setOrders((prev) => [
        {
          id: ++nextId,
          pcId,
          sessionId: session.id,
          itemName,
          quantity,
          unitPrice,
          status: 'pending',
          createdAt: Date.now(),
        },
        ...prev,
      ])
    },
    [sessions],
  )

  const setOrderStatus = useCallback(
    (orderId: number, status: SnackOrder['status']) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      )
    },
    [],
  )

  const togglePcOnline = useCallback((pcId: number) => {
    setPcs((prev) =>
      prev.map((p) => {
        if (p.id !== pcId) return p
        if (p.status === 'offline')
          return { ...p, status: 'available', lastHeartbeat: Date.now() }
        if (p.status === 'available')
          return { ...p, status: 'offline', lastHeartbeat: Date.now() - 600_000 }
        return p
      }),
    )
  }, [])

  const value = useMemo(
    () => ({
      pcs,
      sessions,
      orders,
      settings,
      tick,
      startSession,
      endSession,
      addOrder,
      setOrderStatus,
      togglePcOnline,
    }),
    [pcs, sessions, orders, settings, tick, startSession, endSession, addOrder, setOrderStatus, togglePcOnline],
  )

  return <CafeContext.Provider value={value}>{children}</CafeContext.Provider>
}

export function useCafe(): CafeState {
  const ctx = useContext(CafeContext)
  if (!ctx) throw new Error('useCafe must be used within CafeProvider')
  return ctx
}
