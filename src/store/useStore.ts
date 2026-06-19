import { create } from 'zustand'
import type { BodyRecord, BodyStatus, KilnSlot, Reservation, Settlement, DashboardStats } from '../../shared/types'
import * as api from '@/lib/api'

interface AppState {
  bodies: BodyRecord[]
  kilnSlots: KilnSlot[]
  reservations: Reservation[]
  stats: DashboardStats | null
  settlements: Settlement[]
  loading: boolean
  error: string | null

  fetchBodies: (status?: BodyStatus) => Promise<void>
  fetchKilnSlots: (startDate: string, endDate: string) => Promise<void>
  fetchReservations: () => Promise<void>
  fetchStats: () => Promise<void>
  fetchSettlements: () => Promise<void>
  clearError: () => void
}

const useStore = create<AppState>((set) => ({
  bodies: [],
  kilnSlots: [],
  reservations: [],
  stats: null,
  settlements: [],
  loading: false,
  error: null,

  fetchBodies: async (status?: BodyStatus) => {
    set({ loading: true, error: null })
    try {
      const bodies = await api.fetchBodies(status)
      set({ bodies, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  fetchKilnSlots: async (startDate: string, endDate: string) => {
    set({ loading: true, error: null })
    try {
      const kilnSlots = await api.fetchKilnSlots(startDate, endDate)
      set({ kilnSlots, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  fetchReservations: async () => {
    set({ loading: true, error: null })
    try {
      const reservations = await api.fetchReservations()
      set({ reservations, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  fetchStats: async () => {
    set({ loading: true, error: null })
    try {
      const stats = await api.fetchDashboardStats()
      set({ stats, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  fetchSettlements: async () => {
    set({ loading: true, error: null })
    try {
      const settlements = await api.fetchSettlements()
      set({ settlements, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  clearError: () => set({ error: null }),
}))

export default useStore
