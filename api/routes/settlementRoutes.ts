import { Router, type Request, type Response } from 'express'
import { calculateFee, confirmSettlement, getSettlements, getSettlementById } from '../services/settlementService.js'

const router = Router()

router.post('/calculate', (req: Request, res: Response): void => {
  try {
    const { bodyId } = req.body
    if (!bodyId) {
      res.status(400).json({ success: false, error: '缺少bodyId' })
      return
    }
    const fee = calculateFee(bodyId)
    res.json({ success: true, data: fee })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { bodyId } = req.body
    if (!bodyId) {
      res.status(400).json({ success: false, error: '缺少bodyId' })
      return
    }
    const settlement = confirmSettlement(bodyId)
    res.status(201).json({ success: true, data: settlement })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

router.get('/', (req: Request, res: Response): void => {
  try {
    const settlements = getSettlements()
    res.json({ success: true, data: settlements })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id, 10)
    const settlement = getSettlementById(id)
    if (!settlement) {
      res.status(404).json({ success: false, error: '结算记录不存在' })
      return
    }
    res.json({ success: true, data: settlement })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
