import { Router, type Request, type Response } from 'express'
import { getKilnSlots, createReservation, getReservations, cancelReservation } from '../services/reservationService.js'

const kilnRouter = Router()

kilnRouter.get('/slots', (req: Request, res: Response): void => {
  try {
    const { startDate, endDate } = req.query
    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: '缺少startDate或endDate参数' })
      return
    }
    const slots = getKilnSlots(startDate as string, endDate as string)
    res.json({ success: true, data: slots })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

const reservationRouter = Router()

reservationRouter.post('/', (req: Request, res: Response): void => {
  try {
    const { bodyId, date, period } = req.body
    if (!bodyId || !date || !period) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const reservation = createReservation({ bodyId, date, period })
    res.status(201).json({ success: true, data: reservation })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

reservationRouter.get('/', (req: Request, res: Response): void => {
  try {
    const reservations = getReservations()
    res.json({ success: true, data: reservations })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

reservationRouter.delete('/:id', (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id, 10)
    const reservation = cancelReservation(id)
    res.json({ success: true, data: reservation })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

export { kilnRouter, reservationRouter }
