export type BodySize = 'small' | 'medium' | 'large'
export type GlazeType = 'bisque' | 'transparent' | 'colored' | 'crystal'
export type BodyStatus = 'stored' | 'reserved' | 'firing' | 'completed'
export type KilnPeriod = 'morning' | 'afternoon' | 'evening'
export type ReservationStatus = 'pending' | 'firing' | 'completed' | 'cancelled'

export interface CreateBodyRequest {
  bodyNo: string
  size: BodySize
  glazeType: GlazeType
  customerName: string
  customerPhone: string
}

export interface BodyRecord {
  id: number
  bodyNo: string
  size: BodySize
  glazeType: GlazeType
  customerName: string
  customerPhone: string
  status: BodyStatus
  storageStartDate: string
  reservationId: number | null
  createdAt: string
  updatedAt: string
}

export interface KilnSlot {
  date: string
  period: KilnPeriod
  totalCapacity: number
  usedCapacity: number
  availableCapacity: number
}

export interface CreateReservationRequest {
  bodyId: number
  date: string
  period: KilnPeriod
}

export interface Reservation {
  id: number
  bodyId: number
  bodyNo: string
  date: string
  period: KilnPeriod
  status: ReservationStatus
  createdAt: string
}

export interface FeeCalculation {
  bodyId: number
  bodyNo: string
  size: BodySize
  glazeType: GlazeType
  firingFee: number
  storageDays: number
  freeStorageDays: number
  overdueDays: number
  storageFee: number
  totalFee: number
}

export interface Settlement {
  id: number
  bodyId: number
  bodyNo: string
  reservationId: number | null
  firingFee: number
  storageDays: number
  overdueDays: number
  storageFee: number
  totalFee: number
  settledAt: string
  createdAt: string
}

export interface DashboardStats {
  totalBodies: number
  storedCount: number
  reservedCount: number
  firingCount: number
  completedCount: number
  expiringCount: number
  overdueCount: number
}

export interface EstimateRequest {
  size: BodySize
  glazeType: GlazeType
  storageDays: number
}
