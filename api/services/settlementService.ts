import { db } from '../db.js'
import type { FeeCalculation, Settlement, BodySize, GlazeType } from '../../shared/types.js'
import { getBodyById, updateBodyStatus, FREE_STORAGE_DAYS, DAILY_STORAGE_FEE, getStorageDays } from './bodyService.js'
import { getReservationById } from './reservationService.js'

export function calculateFee(bodyId: number): FeeCalculation {
  const body = getBodyById(bodyId)
  if (!body) {
    throw new Error('陶坯不存在')
  }

  const feeRow = db.prepare('SELECT firing_fee FROM fee_config WHERE size = ? AND glaze_type = ?').get(body.size, body.glazeType) as { firing_fee: number } | undefined

  if (!feeRow) {
    throw new Error('未找到对应的费用配置')
  }

  const firingFee = feeRow.firing_fee
  const storageDays = getStorageDays(body.storageStartDate)
  const freeStorageDays = FREE_STORAGE_DAYS
  const overdueDays = Math.max(0, storageDays - freeStorageDays)
  const storageFee = overdueDays * DAILY_STORAGE_FEE
  const totalFee = firingFee + storageFee

  return {
    bodyId: body.id,
    bodyNo: body.bodyNo,
    size: body.size,
    glazeType: body.glazeType,
    firingFee,
    storageDays,
    freeStorageDays,
    overdueDays,
    storageFee,
    totalFee,
  }
}

export function confirmSettlement(bodyId: number): Settlement {
  const body = getBodyById(bodyId)
  if (!body) {
    throw new Error('陶坯不存在')
  }

  if (body.status === 'completed') {
    throw new Error('该陶坯已结算')
  }

  const fee = calculateFee(bodyId)

  const stmt = db.prepare(`
    INSERT INTO settlements (body_id, reservation_id, firing_fee, storage_days, overdue_days, storage_fee, total_fee)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    bodyId,
    body.reservationId,
    fee.firingFee,
    fee.storageDays,
    fee.overdueDays,
    fee.storageFee,
    fee.totalFee,
  )

  updateBodyStatus(bodyId, 'completed')

  if (body.reservationId) {
    const reservation = getReservationById(body.reservationId)
    if (reservation && reservation.status !== 'completed') {
      db.prepare("UPDATE reservations SET status = 'completed' WHERE id = ?").run(body.reservationId)
    }
  }

  return getSettlementById(result.lastInsertRowid as number)!
}

export function getSettlements(): Settlement[] {
  const rows = db.prepare(`
    SELECT s.*, b.body_no
    FROM settlements s
    JOIN bodies b ON s.body_id = b.id
    ORDER BY s.created_at DESC
  `).all() as any[]

  return rows.map(row => ({
    id: row.id,
    bodyId: row.body_id,
    bodyNo: row.body_no,
    reservationId: row.reservation_id,
    firingFee: row.firing_fee,
    storageDays: row.storage_days,
    overdueDays: row.overdue_days,
    storageFee: row.storage_fee,
    totalFee: row.total_fee,
    settledAt: row.settled_at,
    createdAt: row.created_at,
  }))
}

export function getSettlementById(id: number): Settlement | null {
  const row = db.prepare(`
    SELECT s.*, b.body_no
    FROM settlements s
    JOIN bodies b ON s.body_id = b.id
    WHERE s.id = ?
  `).get(id) as any | undefined

  if (!row) return null

  return {
    id: row.id,
    bodyId: row.body_id,
    bodyNo: row.body_no,
    reservationId: row.reservation_id,
    firingFee: row.firing_fee,
    storageDays: row.storage_days,
    overdueDays: row.overdue_days,
    storageFee: row.storage_fee,
    totalFee: row.total_fee,
    settledAt: row.settled_at,
    createdAt: row.created_at,
  }
}

export function estimateFee(size: BodySize, glazeType: GlazeType, storageDays: number): FeeCalculation {
  const feeRow = db.prepare('SELECT firing_fee FROM fee_config WHERE size = ? AND glaze_type = ?').get(size, glazeType) as { firing_fee: number } | undefined

  if (!feeRow) {
    throw new Error('未找到对应的费用配置')
  }

  const firingFee = feeRow.firing_fee
  const freeStorageDays = FREE_STORAGE_DAYS
  const overdueDays = Math.max(0, storageDays - freeStorageDays)
  const storageFee = overdueDays * DAILY_STORAGE_FEE
  const totalFee = firingFee + storageFee

  return {
    bodyId: 0,
    bodyNo: '',
    size,
    glazeType,
    firingFee,
    storageDays,
    freeStorageDays,
    overdueDays,
    storageFee,
    totalFee,
  }
}
