import { Router, type Request, type Response } from 'express'
import { estimateFee } from '../services/settlementService.js'
import type { BodySize, GlazeType } from '../../shared/types.js'

const router = Router()

router.post('/estimate', (req: Request, res: Response): void => {
  try {
    const { size, glazeType, storageDays } = req.body
    if (!size || !glazeType || storageDays === undefined) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const fee = estimateFee(size as BodySize, glazeType as GlazeType, storageDays)
    res.json({ success: true, data: fee })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

export default router
