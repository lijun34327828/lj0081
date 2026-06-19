import { Router, type Request, type Response } from 'express'
import { createBody, getBodies, getBodyById, updateBodyStatus } from '../services/bodyService.js'
import type { BodyStatus } from '../../shared/types.js'

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  try {
    const { bodyNo, size, glazeType, customerName, customerPhone } = req.body
    if (!bodyNo || !size || !glazeType || !customerName || !customerPhone) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const body = createBody({ bodyNo, size, glazeType, customerName, customerPhone })
    res.status(201).json({ success: true, data: body })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/', (req: Request, res: Response): void => {
  try {
    const status = req.query.status as BodyStatus | undefined
    const bodies = getBodies(status)
    res.json({ success: true, data: bodies })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id, 10)
    const body = getBodyById(id)
    if (!body) {
      res.status(404).json({ success: false, error: '陶坯不存在' })
      return
    }
    res.json({ success: true, data: body })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/:id/status', (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id, 10)
    const { status } = req.body
    if (!status) {
      res.status(400).json({ success: false, error: '缺少状态字段' })
      return
    }
    const body = updateBodyStatus(id, status as BodyStatus)
    if (!body) {
      res.status(404).json({ success: false, error: '陶坯不存在' })
      return
    }
    res.json({ success: true, data: body })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
