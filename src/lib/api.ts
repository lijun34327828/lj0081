import type { BodyRecord, BodyStatus, KilnSlot, Reservation, FeeCalculation, Settlement, DashboardStats, BodySize, GlazeType } from '../../shared/types'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json()
  if (!json.success) {
    throw new Error(json.error || '请求失败')
  }
  return json.data as T
}

export function fetchBodies(status?: BodyStatus): Promise<BodyRecord[]> {
  const params = status ? `?status=${status}` : ''
  return request<BodyRecord[]>(`/api/bodies${params}`)
}

export function fetchBodyById(id: number): Promise<BodyRecord> {
  return request<BodyRecord>(`/api/bodies/${id}`)
}

export function createBody(data: { bodyNo: string; size: BodySize; glazeType: GlazeType; customerName: string; customerPhone: string }): Promise<BodyRecord> {
  return request<BodyRecord>('/api/bodies', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateBodyStatus(id: number, status: BodyStatus): Promise<BodyRecord> {
  return request<BodyRecord>(`/api/bodies/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

export function fetchKilnSlots(startDate: string, endDate: string): Promise<KilnSlot[]> {
  return request<KilnSlot[]>(`/api/kiln/slots?startDate=${startDate}&endDate=${endDate}`)
}

export function createReservation(data: { bodyId: number; date: string; period: string }): Promise<Reservation> {
  return request<Reservation>('/api/reservations', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function fetchReservations(): Promise<Reservation[]> {
  return request<Reservation[]>('/api/reservations')
}

export function cancelReservation(id: number): Promise<Reservation> {
  return request<Reservation>(`/api/reservations/${id}`, {
    method: 'DELETE',
  })
}

export function calculateFee(bodyId: number): Promise<FeeCalculation> {
  return request<FeeCalculation>('/api/settlements/calculate', {
    method: 'POST',
    body: JSON.stringify({ bodyId }),
  })
}

export function confirmSettlement(bodyId: number): Promise<Settlement> {
  return request<Settlement>('/api/settlements', {
    method: 'POST',
    body: JSON.stringify({ bodyId }),
  })
}

export function fetchSettlements(): Promise<Settlement[]> {
  return request<Settlement[]>('/api/settlements')
}

export function fetchSettlementById(id: number): Promise<Settlement> {
  return request<Settlement>(`/api/settlements/${id}`)
}

export function fetchDashboardStats(): Promise<DashboardStats> {
  return request<DashboardStats>('/api/dashboard/stats')
}

export function fetchExpiringBodies(): Promise<BodyRecord[]> {
  return request<BodyRecord[]>('/api/dashboard/expiring')
}

export function fetchPendingBodies(): Promise<BodyRecord[]> {
  return request<BodyRecord[]>('/api/dashboard/pending')
}

export function estimateFee(size: BodySize, glazeType: GlazeType, storageDays: number): Promise<FeeCalculation> {
  return request<FeeCalculation>('/api/calculator/estimate', {
    method: 'POST',
    body: JSON.stringify({ size, glazeType, storageDays }),
  })
}
