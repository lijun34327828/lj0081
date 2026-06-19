import { db } from '../db.js'
import type { CreateBodyRequest, BodyRecord, BodyStatus } from '../../shared/types.js'

const FREE_STORAGE_DAYS = 30
const DAILY_STORAGE_FEE = 5

function calculateStorageDays(storageStartDate: string): number {
  const start = new Date(storageStartDate)
  const now = new Date()
  const diffTime = now.getTime() - start.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

function generateBodyNo(): string {
  const now = new Date()
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')

  const prefix = `PT${dateStr}`

  const row = db.prepare(`
    SELECT body_no FROM bodies WHERE body_no LIKE ? ORDER BY body_no DESC LIMIT 1
  `).get(`${prefix}%`) as { body_no: string } | undefined

  let seq = 1
  if (row) {
    const lastSeq = parseInt(row.body_no.slice(-3), 10)
    seq = lastSeq + 1
  }

  return `${prefix}${String(seq).padStart(3, '0')}`
}

export function createBody(data: CreateBodyRequest): BodyRecord {
  const bodyNo = generateBodyNo()
  const storageStartDate = new Date().toISOString().split('T')[0]

  const stmt = db.prepare(`
    INSERT INTO bodies (body_no, size, glaze_type, customer_name, customer_phone, status, storage_start_date)
    VALUES (?, ?, ?, ?, ?, 'stored', ?)
  `)

  const result = stmt.run(bodyNo, data.size, data.glazeType, data.customerName, data.customerPhone, storageStartDate)

  return getBodyById(result.lastInsertRowid as number)!
}

export function getBodies(status?: BodyStatus): BodyRecord[] {
  let sql = 'SELECT * FROM bodies'
  const params: string[] = []

  if (status) {
    sql += ' WHERE status = ?'
    params.push(status)
  }

  sql += ' ORDER BY created_at DESC'

  const rows = db.prepare(sql).all(...params) as any[]

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

export function getBodyById(id: number): BodyRecord | null {
  const row = db.prepare('SELECT * FROM bodies WHERE id = ?').get(id) as any | undefined

  if (!row) return null

  return {
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
  }
}

export function updateBodyStatus(id: number, status: BodyStatus): BodyRecord | null {
  db.prepare("UPDATE bodies SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id)
  return getBodyById(id)
}

export function getExpiringBodies(days: number = 3): BodyRecord[] {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + days)
  const targetDateStr = targetDate.toISOString().split('T')[0]

  const rows = db.prepare(`
    SELECT * FROM bodies
    WHERE status IN ('stored', 'reserved')
    AND storage_start_date <= ?
    AND date(storage_start_date, '+${FREE_STORAGE_DAYS} days') <= ?
    ORDER BY storage_start_date ASC
  `).all(targetDateStr, targetDateStr) as any[]

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

export function getOverdueBodies(): BodyRecord[] {
  const today = new Date().toISOString().split('T')[0]

  const rows = db.prepare(`
    SELECT * FROM bodies
    WHERE status IN ('stored', 'reserved')
    AND date(storage_start_date, '+${FREE_STORAGE_DAYS} days') < ?
    ORDER BY storage_start_date ASC
  `).all(today) as any[]

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

export function getStorageDays(storageStartDate: string): number {
  return calculateStorageDays(storageStartDate)
}

export { FREE_STORAGE_DAYS, DAILY_STORAGE_FEE }
