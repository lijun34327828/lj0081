import { useState, useEffect } from 'react'
import { Receipt, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react'
import { fetchBodies, calculateFee, confirmSettlement, fetchSettlements } from '@/lib/api'
import type { BodyRecord, FeeCalculation, Settlement } from '../../shared/types'
import StatusBadge from '@/components/StatusBadge'

const glazeLabels: Record<string, string> = {
  bisque: '素坯',
  transparent: '透明釉',
  colored: '彩釉',
  crystal: '结晶釉',
}

const sizeLabels: Record<string, string> = {
  small: '小件',
  medium: '中件',
  large: '大件',
}

export default function Settlement() {
  const [bodies, setBodies] = useState<BodyRecord[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [selectedBody, setSelectedBody] = useState<number | null>(null)
  const [feeCalc, setFeeCalc] = useState<FeeCalculation | null>(null)
  const [loadingFee, setLoadingFee] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const allBodies = await fetchBodies()
      const filtered = allBodies.filter(b => b.status === 'reserved' || b.status === 'firing')
      setBodies(filtered)
      const settlementData = await fetchSettlements()
      setSettlements(settlementData)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const handleSelectBody = async (bodyId: number) => {
    setSelectedBody(bodyId)
    setFeeCalc(null)
    setLoadingFee(true)
    try {
      const fee = await calculateFee(bodyId)
      setFeeCalc(fee)
    } catch (err: any) {
      alert(err.message || '计算费用失败')
    } finally {
      setLoadingFee(false)
    }
  }

  const handleConfirmSettlement = async () => {
    if (!selectedBody) return
    setConfirming(true)
    try {
      await confirmSettlement(selectedBody)
      setSelectedBody(null)
      setFeeCalc(null)
      await loadData()
    } catch (err: any) {
      alert(err.message || '结算失败')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-pottery-800 mb-6">烧制结算</h2>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-pottery-500" />
              <h3 className="font-serif text-lg font-semibold text-pottery-700">待结算坯体</h3>
            </div>
            {loading ? (
              <p className="text-pottery-400 text-center py-8">加载中...</p>
            ) : bodies.length === 0 ? (
              <p className="text-pottery-300 text-center py-8">暂无待结算坯体</p>
            ) : (
              <div className="space-y-2">
                {bodies.map((body) => (
                  <div
                    key={body.id}
                    onClick={() => handleSelectBody(body.id)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-all border ${
                      selectedBody === body.id
                        ? 'border-kiln-400 bg-kiln-50'
                        : 'border-pottery-100 hover:border-pottery-300 hover:bg-pottery-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium text-pottery-700">{body.bodyNo}</span>
                      <StatusBadge status={body.status} />
                      <span className="text-xs text-pottery-400">
                        {sizeLabels[body.size]} · {glazeLabels[body.glazeType]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-pottery-400">{body.customerName}</span>
                      <ChevronRight className="w-4 h-4 text-pottery-300" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card sticky top-8">
            <h3 className="font-serif text-lg font-semibold text-pottery-700 mb-4">费用明细</h3>
            {!selectedBody ? (
              <p className="text-pottery-300 text-center py-8 text-sm">请选择坯体查看费用</p>
            ) : loadingFee ? (
              <p className="text-pottery-400 text-center py-8 text-sm">计算中...</p>
            ) : feeCalc ? (
              <div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-pottery-500">坯体编号</span>
                    <span className="font-mono text-pottery-700">{feeCalc.bodyNo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-pottery-500">烧制服务费</span>
                    <span className="text-pottery-700 font-medium">¥{feeCalc.firingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-pottery-500">寄存天数</span>
                    <span className="text-pottery-700">{feeCalc.storageDays}天</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-pottery-500">免费寄存</span>
                    <span className="text-pottery-700">{feeCalc.freeStorageDays}天</span>
                  </div>
                  {feeCalc.overdueDays > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-kiln-500 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />超期天数
                        </span>
                        <span className="text-kiln-600 font-medium">{feeCalc.overdueDays}天</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-kiln-500">保管费</span>
                        <span className="text-kiln-600 font-medium">¥{feeCalc.storageFee.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="border-t border-pottery-100 pt-3 flex justify-between">
                    <span className="text-pottery-700 font-semibold">合计</span>
                    <span className="text-kiln-600 text-xl font-bold">¥{feeCalc.totalFee.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={handleConfirmSettlement}
                  disabled={confirming}
                  className="btn-kiln w-full flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {confirming ? '结算中...' : '确认结算'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {settlements.length > 0 && (
        <div className="card mt-6">
          <h3 className="font-serif text-lg font-semibold text-pottery-700 mb-4">结算历史</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pottery-100">
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">坯体编号</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">烧制费</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">寄存天数</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">超期天数</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">保管费</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">合计</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">结算时间</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id} className="border-b border-pottery-50 hover:bg-pottery-50/50">
                    <td className="py-3 px-4 font-mono text-pottery-700">{s.bodyNo}</td>
                    <td className="py-3 px-4">¥{s.firingFee.toFixed(2)}</td>
                    <td className="py-3 px-4">{s.storageDays}天</td>
                    <td className="py-3 px-4">
                      {s.overdueDays > 0 ? (
                        <span className="text-kiln-600 font-medium">{s.overdueDays}天</span>
                      ) : (
                        <span>0天</span>
                      )}
                    </td>
                    <td className="py-3 px-4">¥{s.storageFee.toFixed(2)}</td>
                    <td className="py-3 px-4 font-medium text-pottery-700">¥{s.totalFee.toFixed(2)}</td>
                    <td className="py-3 px-4 text-pottery-400 text-xs">{new Date(s.settledAt).toLocaleString('zh-CN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
