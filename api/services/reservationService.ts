import { db } from '../db.js'
import type { KilnSlot, CreateReservationRequest, Reservation, KilnPeriod } from '../../shared/types.js'
import { getBodyById, updateBodyStatus } from './bodyService.js'

export function getKilnSlots(startDate: string, endDate: string): KilnSlot[] {
  const kilnConfigs = db.prepare('SELECT period, total_capacity FROM kiln_config').all() as { period: KilnPeriod; total_capacity: number }[]

  const slots: KilnSlot[] = []

  const start = new Date(startDate)
  const end = new Date(endDate)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]

    for (const config of kilnConfigs) {
      const row = db.prepare(`
        SELECT COUNT(*) as used FROM reservations
        WHERE date = ? AND period = ? AND status != 'cancelled'
      `).get(dateStr, config.period) as { used: number }

      const usedCapacity = row.used
      const availableCapacity = config.total_capacity - usedCapacity

      slots.push({
        date: dateStr,
        period: config.period,
        totalCapacity: config.total_capacity,
        usedCapacity,
        availableCapacity,
      })
    }
  }

  return slots
}

export function createReservation(data: CreateReservationRequest): Reservation {
  const body = getBodyById(data.bodyId)
  if (!body) {
    throw new Error('陶坯不存在')
  }

  if (body.status === 'completed') {
    throw new Error('该陶坯已完成，无法预约')
  }

  const kilnConfig = db.prepare('SELECT total_capacity FROM kiln_config WHERE period = ?').get(data.period) as { total_capacity: number } | undefined
  if (!kilnConfig) {
    throw new Error('无效的窑炉时段')
  }

  const usedRow = db.prepare(`
    SELECT COUNT(*) as used FROM reservations
    WHERE date = ? AND period = ? AND status != 'cancelled'
  `).get(data.date, data.period) as { used: number }

  if (usedRow.used >= kilnConfig.total_capacity) {
    throw new Error('该时段已满，无法预约')
  }

  const stmt = db.prepare(`
    INSERT INTO reservations (body_id, date, period, status)
    VALUES (?, ?, ?, 'pending')
  `)

  const result = stmt.run(data.bodyId, data.date, data.period)

  db.prepare("UPDATE bodies SET reservation_id = ?, status = 'reserved', updated_at = datetime('now') WHERE id = ?").run(result.lastInsertRowid, data.bodyId)

  return getReservationById(result.lastInsertRowid as number)!
}

export function getReservations(): Reservation[] {
  const rows = db.prepare(`
    SELECT r.*, b.body_no
    FROM reservations r
    JOIN bodies b ON r.body_id = b.id
    ORDER BY r.created_at DESC
  `).all() as any[]

  return rows.map(row => ({
    id: row.id,
    bodyId: row.body_id,
    bodyNo: row.body_no,
    date: row.date,
    period: row.period,
    status: row.status,
    createdAt: row.created_at,
  }))
}

export function getReservationById(id: number): Reservation | null {
  const row = db.prepare(`
    SELECT r.*, b.body_no
    FROM reservations r
    JOIN bodies b ON r.body_id = b.id
    WHERE r.id = ?
  `).get(id) as any | undefined

  if (!row) return null

  return {
    id: row.id,
    bodyId: row.body_id,
    bodyNo: row.body_no,
    date: row.date,
    period: row.period,
    status: row.status,
    createdAt: row.created_at,
  }
}

export function cancelReservation(id: number): Reservation | null {
  const reservation = getReservationById(id)
  if (!reservation) {
    throw new Error('预约不存在')
  }

  if (reservation.status === 'completed') {
    throw new Error('已完成的预约无法取消')
  }

  db.prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?").run(id)

  const body = getBodyById(reservation.bodyId)
  if (body && body.reservationId === id) {
    db.prepare("UPDATE bodies SET reservation_id = NULL, status = 'stored', updated_at = datetime('now') WHERE id = ?").run(reservation.bodyId)
  }

  return getReservationById(id)
}
