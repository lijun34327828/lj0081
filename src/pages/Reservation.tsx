import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock, CheckCircle, X, Flame, Calendar } from 'lucide-react'
import useStore from '@/store/useStore'
import { fetchBodies, createReservation, fetchReservations, batchFireBodies } from '@/lib/api'
import type { BodyRecord, KilnSlot, KilnPeriod, Reservation } from '../../shared/types'

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

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]}`
}

const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

interface GroupKey {
  date: string
  period: KilnPeriod
}

export default function Reservation() {
  const { kilnSlots, fetchKilnSlots, loading } = useStore()
  const [weekOffset, setWeekOffset] = useState(0)
  const [storedBodies, setStoredBodies] = useState<BodyRecord[]>([])
  const [selectedSlot, setSelectedSlot] = useState<KilnSlot | null>(null)
  const [selectedBody, setSelectedBody] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [confirmedReservations, setConfirmedReservations] = useState<Reservation[]>([])
  const [selectedBodyIds, setSelectedBodyIds] = useState<Set<number>>(new Set())
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [batchSubmitting, setBatchSubmitting] = useState(false)

  const weekDates = getWeekDates(weekOffset)

  const groupedReservations = useMemo(() => {
    const groups = new Map<string, { key: GroupKey; reservations: Reservation[] }>()
    for (const r of confirmedReservations) {
      const groupKey = `${r.date}_${r.period}`
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { key: { date: r.date, period: r.period }, reservations: [] })
      }
      groups.get(groupKey)!.reservations.push(r)
    }
    return Array.from(groups.values()).sort((a, b) => {
      if (a.key.date !== b.key.date) return a.key.date.localeCompare(b.key.date)
      return periods.indexOf(a.key.period) - periods.indexOf(b.key.period)
    })
  }, [confirmedReservations])

  const loadData = useCallback(async () => {
    const startDate = formatDate(weekDates[0])
    const endDate = formatDate(weekDates[6])
    await fetchKilnSlots(startDate, endDate)
    const bodies = await fetchBodies('stored')
    setStoredBodies(bodies)
  }, [weekOffset])

  const loadReservations = useCallback(async () => {
    try {
      const reservations = await fetchReservations()
      const confirmed = reservations.filter(r => r.status === 'pending')
      setConfirmedReservations(confirmed)
    } catch {
      setConfirmedReservations([])
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [weekOffset])

  useEffect(() => {
    loadReservations()
  }, [])

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
      await loadReservations()
    } catch (err: any) {
      setToast({ message: err.message || '预约失败', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleBodySelect = (bodyId: number) => {
    setSelectedBodyIds(prev => {
      const next = new Set(prev)
      if (next.has(bodyId)) next.delete(bodyId)
      else next.add(bodyId)
      return next
    })
  }

  const toggleGroupSelect = (groupKey: string) => {
    const group = groupedReservations.find(g => `${g.key.date}_${g.key.period}` === groupKey)
    if (!group) return
    const groupBodyIds = group.reservations.map(r => r.bodyId)
    const allSelected = groupBodyIds.every(id => selectedBodyIds.has(id))
    setSelectedBodyIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        groupBodyIds.forEach(id => next.delete(id))
      } else {
        groupBodyIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  const handleBatchFireClick = () => {
    if (selectedBodyIds.size === 0) return
    setShowConfirmModal(true)
  }

  const handleBatchFireConfirm = async () => {
    setBatchSubmitting(true)
    try {
      await batchFireBodies(Array.from(selectedBodyIds))
      setToast({ message: `成功将 ${selectedBodyIds.size} 个坯体入窑烧制！`, type: 'success' })
      setSelectedBodyIds(new Set())
      setShowConfirmModal(false)
      await loadData()
      await loadReservations()
    } catch (err: any) {
      setToast({ message: err.message || '批量入窑失败', type: 'error' })
      setShowConfirmModal(false)
    } finally {
      setBatchSubmitting(false)
    }
  }

  const selectedBodyNos = useMemo(() => {
    return confirmedReservations
      .filter(r => selectedBodyIds.has(r.bodyId))
      .map(r => r.bodyNo)
  }, [confirmedReservations, selectedBodyIds])

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

      <div className="card mt-6">
        <h3 className="font-serif text-lg font-semibold text-pottery-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-kiln-500" />
          已确认预约
        </h3>

        {groupedReservations.length === 0 ? (
          <p className="text-pottery-300 text-center py-8">暂无已确认预约</p>
        ) : (
          <div className="space-y-4">
            {groupedReservations.map((group) => {
              const groupKey = `${group.key.date}_${group.key.period}`
              const groupBodyIds = group.reservations.map(r => r.bodyId)
              const allGroupSelected = groupBodyIds.length > 0 && groupBodyIds.every(id => selectedBodyIds.has(id))
              const someGroupSelected = groupBodyIds.some(id => selectedBodyIds.has(id)) && !allGroupSelected

              return (
                <div key={groupKey} className="border border-pottery-100 rounded-xl overflow-hidden">
                  <div className="bg-pottery-50 px-4 py-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={allGroupSelected}
                      ref={el => {
                        if (el) el.indeterminate = someGroupSelected
                      }}
                      onChange={() => toggleGroupSelect(groupKey)}
                      className="rounded border-pottery-300 text-kiln-500 focus:ring-kiln-400"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-medium text-pottery-700">{formatDisplayDate(group.key.date)}</span>
                      <span className="text-pottery-300">·</span>
                      <span className="flex items-center gap-1 text-kiln-600">
                        <Clock className="w-3.5 h-3.5" />
                        {periodLabels[group.key.period]}
                      </span>
                      <span className="text-pottery-300">·</span>
                      <span className="text-pottery-500 text-sm">{group.reservations.length} 个坯体</span>
                    </div>
                  </div>
                  <div className="divide-y divide-pottery-50">
                    {group.reservations.map((reservation) => (
                      <div
                        key={reservation.id}
                        className={`px-4 py-3 flex items-center gap-3 transition-colors ${
                          selectedBodyIds.has(reservation.bodyId) ? 'bg-kiln-50/50' : 'hover:bg-pottery-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedBodyIds.has(reservation.bodyId)}
                          onChange={() => toggleBodySelect(reservation.bodyId)}
                          className="rounded border-pottery-300 text-kiln-500 focus:ring-kiln-400"
                        />
                        <span className="font-mono text-sm font-medium text-pottery-700">{reservation.bodyNo}</span>
                        <span className="text-xs text-pottery-400 ml-auto">预约于 {new Date(reservation.createdAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedBodyIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-pottery-100 shadow-lg z-30">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-pottery-600">已选择 <span className="font-semibold text-kiln-600">{selectedBodyIds.size}</span> 个坯体</span>
            <button
              onClick={handleBatchFireClick}
              className="btn-kiln flex items-center gap-2"
            >
              <Flame className="w-4 h-4" />
              批量入窑
            </button>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowConfirmModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-[420px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold text-pottery-800 flex items-center gap-2">
                <Flame className="w-5 h-5 text-kiln-500" />
                确认批量入窑
              </h3>
              <button onClick={() => setShowConfirmModal(false)} className="text-pottery-300 hover:text-pottery-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-pottery-500 mb-3">
              即将把以下 <span className="font-semibold text-kiln-600">{selectedBodyNos.length}</span> 个坯体标记为入窑烧制，此操作不可撤销：
            </p>
            <div className="max-h-48 overflow-y-auto border border-pottery-100 rounded-lg p-3 mb-5">
              <div className="flex flex-wrap gap-2">
                {selectedBodyNos.map(no => (
                  <span key={no} className="inline-flex items-center bg-kiln-50 text-kiln-700 text-xs font-mono px-2.5 py-1 rounded-md">
                    {no}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-pottery-200 text-pottery-600 hover:bg-pottery-50 transition-colors text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={handleBatchFireConfirm}
                disabled={batchSubmitting}
                className="flex-1 btn-kiln flex items-center justify-center gap-2"
              >
                <Flame className="w-4 h-4" />
                {batchSubmitting ? '处理中...' : '确认入窑'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
