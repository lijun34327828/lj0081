import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Clock, CheckCircle, X } from 'lucide-react'
import useStore from '@/store/useStore'
import { fetchBodies, createReservation } from '@/lib/api'
import type { BodyRecord, KilnSlot, KilnPeriod } from '../../shared/types'

const periodLabels: Record<KilnPeriod, string> = {
  morning: '上午',
  afternoon: '下午',
  evening: '晚间',
}

const periods: KilnPeriod[] = ['morning', 'afternoon', 'evening']

function formatDate(date: Date): string {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0')
}

function getWeekDates(offset: number): Date[] {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7)
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d)
  }
  return dates
}

const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export default function Reservation() {
  const { kilnSlots, fetchKilnSlots, loading } = useStore()
  const [weekOffset, setWeekOffset] = useState(0)
  const [storedBodies, setStoredBodies] = useState<BodyRecord[]>([])
  const [selectedSlot, setSelectedSlot] = useState<KilnSlot | null>(null)
  const [selectedBody, setSelectedBody] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const weekDates = getWeekDates(weekOffset)

  const loadData = useCallback(async () => {
    const startDate = formatDate(weekDates[0])
    const endDate = formatDate(weekDates[6])
    await fetchKilnSlots(startDate, endDate)
    const bodies = await fetchBodies('stored')
    setStoredBodies(bodies)
  }, [weekOffset])

  useEffect(() => {
    loadData()
  }, [weekOffset])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const getSlotForCell = (date: string, period: KilnPeriod): KilnSlot | undefined => {
    return kilnSlots.find(s => s.date === date && s.period === period)
  }

  const handleCellClick = (slot: KilnSlot) => {
    if (slot.availableCapacity <= 0) return
    setSelectedSlot(slot)
    setSelectedBody(null)
  }

  const handleReserve = async () => {
    if (!selectedSlot || !selectedBody) return
    setSubmitting(true)
    try {
      await createReservation({
        bodyId: selectedBody,
        date: selectedSlot.date,
        period: selectedSlot.period,
      })
      setToast({ message: '预约成功！', type: 'success' })
      setSelectedSlot(null)
      setSelectedBody(null)
      await loadData()
    } catch (err: any) {
      setToast({ message: err.message || '预约失败', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-pottery-800 mb-6">窑位预约</h2>

      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-kiln-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="p-2 rounded-lg hover:bg-pottery-50 text-pottery-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="font-serif text-lg font-semibold text-pottery-700">
              {formatDate(weekDates[0])} ~ {formatDate(weekDates[6])}
            </p>
          </div>
          <button
            onClick={() => setWeekOffset(prev => prev + 1)}
            className="p-2 rounded-lg hover:bg-pottery-50 text-pottery-500 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <p className="text-pottery-400 text-center py-8">加载中...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border border-pottery-100 py-2 px-3 bg-pottery-50 text-pottery-600 w-20">时段</th>
                  {weekDates.map((date, i) => (
                    <th key={i} className="border border-pottery-100 py-2 px-3 bg-pottery-50 text-pottery-600">
                      <div>{weekDays[i]}</div>
                      <div className="text-xs text-pottery-400">{date.getMonth() + 1}/{date.getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period}>
                    <td className="border border-pottery-100 py-3 px-3 bg-pottery-50 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-pottery-400" />
                        <span className="text-pottery-600 font-medium">{periodLabels[period]}</span>
                      </div>
                    </td>
                    {weekDates.map((date, i) => {
                      const dateStr = formatDate(date)
                      const slot = getSlotForCell(dateStr, period)
                      if (!slot) {
                        return (
                          <td key={i} className="border border-pottery-100 py-3 px-3 text-center bg-pottery-50">
                            <span className="text-pottery-300 text-xs">-</span>
                          </td>
                        )
                      }
                      const isAvailable = slot.availableCapacity > 0
                      const isFull = slot.availableCapacity <= 0
                      const progress = slot.totalCapacity > 0 ? slot.usedCapacity / slot.totalCapacity : 0
                      const isSelected = selectedSlot?.date === dateStr && selectedSlot?.period === period
                      return (
                        <td
                          key={i}
                          onClick={() => handleCellClick(slot)}
                          className={`border border-pottery-100 py-3 px-3 text-center cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'bg-kiln-50 ring-2 ring-kiln-400'
                              : isFull
                                ? 'bg-pottery-100 cursor-not-allowed'
                                : isAvailable
                                  ? 'bg-white hover:bg-pottery-50'
                                  : 'bg-pottery-50'
                          }`}
                        >
                          <div className="mb-1">
                            <span className={`text-sm font-medium ${isFull ? 'text-pottery-300' : 'text-pottery-700'}`}>
                              {slot.usedCapacity}/{slot.totalCapacity}
                            </span>
                          </div>
                          <div className="w-full bg-pottery-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                isFull ? 'bg-pottery-300' : progress > 0.7 ? 'bg-kiln-400' : 'bg-pottery-400'
                              }`}
                              style={{ width: `${Math.min(progress * 100, 100)}%` }}
                            />
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSlot && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={() => setSelectedSlot(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-96" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold text-pottery-800">选择坯体</h3>
              <button onClick={() => setSelectedSlot(null)} className="text-pottery-300 hover:text-pottery-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-pottery-500 mb-4">
              {selectedSlot.date} {periodLabels[selectedSlot.period]} · 剩余 {selectedSlot.availableCapacity} 个位置
            </p>
            {storedBodies.length === 0 ? (
              <p className="text-pottery-300 text-center py-4">暂无可预约的坯体</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {storedBodies.map((body) => (
                  <div
                    key={body.id}
                    onClick={() => setSelectedBody(body.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all border ${
                      selectedBody === body.id
                        ? 'border-kiln-400 bg-kiln-50'
                        : 'border-pottery-100 hover:border-pottery-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium text-pottery-700">{body.bodyNo}</span>
                      <span className="text-xs text-pottery-400">{body.customerName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={handleReserve}
              disabled={!selectedBody || submitting}
              className="btn-kiln w-full"
            >
              {submitting ? '预约中...' : '确认预约'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
