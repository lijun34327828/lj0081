import { db } from '../db.js'
import type { DashboardStats, BodyRecord } from '../../shared/types.js'
import { FREE_STORAGE_DAYS } from './bodyService.js'

export function getStats(): DashboardStats {
  const totalBodies = (db.prepare('SELECT COUNT(*) as count FROM bodies').get() as { count: number }).count
  const storedCount = (db.prepare("SELECT COUNT(*) as count FROM bodies WHERE status = 'stored'").get() as { count: number }).count
  const reservedCount = (db.prepare("SELECT COUNT(*) as count FROM bodies WHERE status = 'reserved'").get() as { count: number }).count
  const firingCount = (db.prepare("SELECT COUNT(*) as count FROM bodies WHERE status = 'firing'").get() as { count: number }).count
  const completedCount = (db.prepare("SELECT COUNT(*) as count FROM bodies WHERE status = 'completed'").get() as { count: number }).count

  const today = new Date().toISOString().split('T')[0]
  const expiringTargetDate = new Date()
  expiringTargetDate.setDate(expiringTargetDate.getDate() + 3)
  const expiringTargetStr = expiringTargetDate.toISOString().split('T')[0]

  const expiringCount = (db.prepare(`
    SELECT COUNT(*) as count FROM bodies
    WHERE status IN ('stored', 'reserved')
    AND date(storage_start_date, '+${FREE_STORAGE_DAYS} days') BETWEEN ? AND ?
  `).get(today, expiringTargetStr) as { count: number }).count

  const overdueCount = (db.prepare(`
    SELECT COUNT(*) as count FROM bodies
    WHERE status IN ('stored', 'reserved')
    AND date(storage_start_date, '+${FREE_STORAGE_DAYS} days') < ?
  `).get(today) as { count: number }).count

  return {
    totalBodies,
    storedCount,
    reservedCount,
    firingCount,
    completedCount,
    expiringCount,
    overdueCount,
  }
}

export function getExpiringBodies(): BodyRecord[] {
  const today = new Date().toISOString().split('T')[0]
  const expiringTargetDate = new Date()
  expiringTargetDate.setDate(expiringTargetDate.getDate() + 3)
  const expiringTargetStr = expiringTargetDate.toISOString().split('T')[0]

  const rows = db.prepare(`
    SELECT * FROM bodies
    WHERE status IN ('stored', 'reserved')
    AND date(storage_start_date, '+${FREE_STORAGE_DAYS} days') BETWEEN ? AND ?
    ORDER BY storage_start_date ASC
  `).all(today, expiringTargetStr) as any[]

  return rows.map(row => ({
    id: row.id,
    bodyNo: row.body_no,
    size: row.size,
    glazeType: row.glaze_type,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    status: row.status,
    storageStartDate: row.storage_start_date,
    reservationId: row.reservation_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export function getPendingBodies(): BodyRecord[] {
  const rows = db.prepare(`
    SELECT * FROM bodies
    WHERE status IN ('stored', 'reserved')
    ORDER BY storage_start_date ASC
  `).all() as any[]

  return rows.map(row => ({
    id: row.id,
    bodyNo: row.body_no,
    size: row.size,
    glazeType: row.glaze_type,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    status: row.status,
    storageStartDate: row.storage_start_date,
    reservationId: row.reservation_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}
