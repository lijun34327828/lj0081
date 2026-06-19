import { Router, type Request, type Response } from 'express'
import { getStats, getExpiringBodies, getPendingBodies } from '../services/dashboardService.js'

const router = Router()

router.get('/stats', (req: Request, res: Response): void => {
  try {
    const stats = getStats()
    res.json({ success: true, data: stats })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/expiring', (req: Request, res: Response): void => {
  try {
    const bodies = getExpiringBodies()
    res.json({ success: true, data: bodies })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/pending', (req: Request, res: Response): void => {
  try {
    const bodies = getPendingBodies()
    res.json({ success: true, data: bodies })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
