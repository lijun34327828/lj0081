import { db } from '../db.js'
import type { CreateBodyRequest, BodyRecord, BodyStatus, KilnPeriod, Reservation } from '../../shared/types.js'

const FREE_STORAGE_DAYS = 30
const DAILY_STORAGE_FEE = 5

function calculateStorageDays(storageStartDate: string): number {
  const start = new Date(storageStartDate)
  const now = new Date()
  const diffTime = now.getTime() - start.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

function getLocalDateStr(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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
  let bodyNo = (data.bodyNo || '').trim()
  if (!bodyNo) {
    bodyNo = generateBodyNo()
  } else {
    const existing = db.prepare('SELECT id FROM bodies WHERE body_no = ?').get(bodyNo)
    if (existing) {
      throw new Error(`坯体编号 ${bodyNo} 已存在，请使用其他编号`)
    }
  }
  const storageStartDate = getLocalDateStr()

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

export function deleteBody(id: number): void {
  const body = getBodyById(id)
  if (!body) {
    throw new Error('陶坯不存在')
  }
  if (body.status === 'firing' || body.status === 'completed') {
    throw new Error('该坯体已进入烧制或已结算，无法删除')
  }
  const reservationCount = (db.prepare('SELECT COUNT(*) as count FROM reservations WHERE body_id = ? AND status != ?').get(id, 'cancelled') as { count: number }).count
  if (reservationCount > 0) {
    throw new Error('该坯体存在有效预约，请先取消预约再删除')
  }
  const settlementCount = (db.prepare('SELECT COUNT(*) as count FROM settlements WHERE body_id = ?').get(id) as { count: number }).count
  if (settlementCount > 0) {
    throw new Error('该坯体已结算，无法删除')
  }
  db.prepare('DELETE FROM reservations WHERE body_id = ?').run(id)
  db.prepare('DELETE FROM bodies WHERE id = ?').run(id)
}

export function updateBodyStatus(id: number, status: BodyStatus): BodyRecord | null {
  db.prepare("UPDATE bodies SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id)
  return getBodyById(id)
}

export function getExpiringBodies(days: number = 3): BodyRecord[] {
  const today = getLocalDateStr()
  const target = new Date()
  target.setDate(target.getDate() + days)
  const targetDateStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`

  const rows = db.prepare(`
    SELECT * FROM bodies
    WHERE status IN ('stored', 'reserved')
    AND storage_start_date <= ?
    AND date(storage_start_date, '+${FREE_STORAGE_DAYS} days') <= ?
    ORDER BY storage_start_date ASC
  `).all(today, targetDateStr) as any[]

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
  const today = getLocalDateStr()

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

export function batchFireBodies(bodyIds: number[]): { updatedBodies: BodyRecord[]; updatedReservations: Reservation[] } {
  if (!Array.isArray(bodyIds) || bodyIds.length === 0) {
    throw new Error('请提供至少一个坯体编号')
  }

  const bodies: BodyRecord[] = []
  const errors: { bodyId: number; reason: string }[] = []

  for (const id of bodyIds) {
    const body = getBodyById(id)
    if (!body) {
      errors.push({ bodyId: id, reason: '坯体不存在' })
      continue
    }
    if (body.status !== 'reserved') {
      errors.push({ bodyId: id, reason: `坯体状态为 ${body.status}，非 reserved 状态` })
      continue
    }
    bodies.push(body)
  }

  if (errors.length > 0) {
    throw new Error(`以下坯体校验不通过：${errors.map(e => `#${e.bodyId} ${e.reason}`).join('；')}`)
  }

  const reservationRows = bodies.map(body => {
    if (!body.reservationId) {
      errors.push({ bodyId: body.id, reason: '坯体无关联预约' })
      return null
    }
    const row = db.prepare('SELECT * FROM reservations WHERE id = ?').get(body.reservationId) as any | undefined
    if (!row) {
      errors.push({ bodyId: body.id, reason: '关联预约不存在' })
      return null
    }
    if (row.status !== 'pending') {
      errors.push({ bodyId: body.id, reason: `预约状态为 ${row.status}，非 pending 状态` })
      return null
    }
    return { bodyId: body.id, date: row.date, period: row.period, reservationId: row.id }
  }).filter(Boolean) as { bodyId: number; date: string; period: KilnPeriod; reservationId: number }[]

  if (errors.length > 0) {
    throw new Error(`以下坯体校验不通过：${errors.map(e => `#${e.bodyId} ${e.reason}`).join('；')}`)
  }

  const firstDate = reservationRows[0].date
  const firstPeriod = reservationRows[0].period
  for (const r of reservationRows) {
    if (r.date !== firstDate || r.period !== firstPeriod) {
      throw new Error(`坯体 #${r.bodyId} 的窑次日期/时段（${r.date} ${r.period}）与首批（${firstDate} ${firstPeriod}）不一致，所有坯体必须属于同一窑次日期和时段`)
    }
  }

  const batchUpdate = db.transaction(() => {
    for (const body of bodies) {
      db.prepare("UPDATE bodies SET status = 'firing', updated_at = datetime('now') WHERE id = ?").run(body.id)
    }
    for (const r of reservationRows) {
      db.prepare("UPDATE reservations SET status = 'completed' WHERE id = ?").run(r.reservationId)
    }
  })

  batchUpdate()

  const updatedBodies = bodyIds.map(id => getBodyById(id)!)
  const updatedReservations = reservationRows.map(r => {
    const row = db.prepare('SELECT r.*, b.body_no FROM reservations r JOIN bodies b ON r.body_id = b.id WHERE r.id = ?').get(r.reservationId) as any
    return {
      id: row.id,
      bodyId: row.body_id,
      bodyNo: row.body_no,
      date: row.date,
      period: row.period,
      status: row.status,
      createdAt: row.created_at,
    } as Reservation
  })

  return { updatedBodies, updatedReservations }
}

export { FREE_STORAGE_DAYS, DAILY_STORAGE_FEE }
