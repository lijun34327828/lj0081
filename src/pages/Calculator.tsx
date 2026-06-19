import { useState, useEffect, useCallback } from 'react'
import { Box, Palette, CalendarDays, Sparkles } from 'lucide-react'
import { estimateFee } from '@/lib/api'
import type { BodySize, GlazeType, FeeCalculation } from '../../shared/types'

const sizeOptions: { value: BodySize; label: string; icon: string }[] = [
  { value: 'small', label: '小件', icon: '🏺' },
  { value: 'medium', label: '中件', icon: '🫕' },
  { value: 'large', label: '大件', icon: '🫙' },
]

const glazeOptions: { value: GlazeType; label: string; desc: string }[] = [
  { value: 'bisque', label: '素坯', desc: '不上釉' },
  { value: 'transparent', label: '透明釉', desc: '清透光泽' },
  { value: 'colored', label: '彩釉', desc: '多彩装饰' },
  { value: 'crystal', label: '结晶釉', desc: '晶花效果' },
]

export default function Calculator() {
  const [size, setSize] = useState<BodySize>('small')
  const [glazeType, setGlazeType] = useState<GlazeType>('bisque')
  const [storageDays, setStorageDays] = useState(1)
  const [feeData, setFeeData] = useState<FeeCalculation | null>(null)
  const [loading, setLoading] = useState(false)

  const calcFee = useCallback(async () => {
    setLoading(true)
    try {
      const data = await estimateFee(size, glazeType, storageDays)
      setFeeData(data)
    } catch {
      setFeeData(null)
    } finally {
      setLoading(false)
    }
  }, [size, glazeType, storageDays])

  useEffect(() => {
    calcFee()
  }, [calcFee])

  const overdueDays = Math.max(0, storageDays - 30)
  const storageFee = overdueDays * 5

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-pottery-800 mb-6">费用估算</h2>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 space-y-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Box className="w-5 h-5 text-pottery-500" />
              <h3 className="font-serif text-lg font-semibold text-pottery-700">选择尺寸</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {sizeOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => setSize(opt.value)}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 text-center ${
                    size === opt.value
                      ? 'border-pottery-500 bg-pottery-50 shadow-sm'
                      : 'border-pottery-100 hover:border-pottery-300 bg-white'
                  }`}
                >
                  <div className="text-3xl mb-2">{opt.icon}</div>
                  <p className={`font-medium ${size === opt.value ? 'text-pottery-700' : 'text-pottery-500'}`}>{opt.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-pottery-500" />
              <h3 className="font-serif text-lg font-semibold text-pottery-700">选择釉料</h3>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {glazeOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => setGlazeType(opt.value)}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 text-center ${
                    glazeType === opt.value
                      ? 'border-pottery-500 bg-pottery-50 shadow-sm'
                      : 'border-pottery-100 hover:border-pottery-300 bg-white'
                  }`}
                >
                  <Sparkles className={`w-5 h-5 mx-auto mb-2 ${glazeType === opt.value ? 'text-pottery-500' : 'text-pottery-300'}`} />
                  <p className={`font-medium text-sm ${glazeType === opt.value ? 'text-pottery-700' : 'text-pottery-500'}`}>{opt.label}</p>
                  <p className="text-xs text-pottery-400 mt-1">{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-5 h-5 text-pottery-500" />
              <h3 className="font-serif text-lg font-semibold text-pottery-700">寄存天数</h3>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={90}
                value={storageDays}
                onChange={(e) => setStorageDays(Number(e.target.value))}
                className="flex-1 h-2 bg-pottery-100 rounded-lg appearance-none cursor-pointer accent-pottery-500"
              />
              <div className="w-20 text-center">
                <span className="text-2xl font-bold text-pottery-700">{storageDays}</span>
                <span className="text-sm text-pottery-400 ml-1">天</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-pottery-300 mt-1 px-1">
              <span>1天</span>
              <span>30天（免费）</span>
              <span>90天</span>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <div className="card sticky top-8 bg-gradient-to-br from-white to-pottery-50 border-2 border-pottery-200">
            <h3 className="font-serif text-lg font-semibold text-pottery-700 mb-4">费用预览</h3>
            {loading ? (
              <p className="text-pottery-400 text-center py-8">计算中...</p>
            ) : feeData ? (
              <div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-pottery-500">烧制服务费</span>
                    <span className="text-pottery-700 font-medium">¥{feeData.firingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-pottery-500">免费寄存</span>
                    <span className="text-pottery-700">{feeData.freeStorageDays}天</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-pottery-500">超期寄存</span>
                    <span className={overdueDays > 0 ? 'text-kiln-600 font-medium' : 'text-pottery-700'}>
                      {overdueDays}天
                    </span>
                  </div>
                  {overdueDays > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-kiln-500">保管费</span>
                      <span className="text-kiln-600 font-medium">¥{storageFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-pottery-200 pt-4 mt-2">
                    <div className="flex justify-between items-end">
                      <span className="text-pottery-700 font-semibold text-lg">合计</span>
                      <span className="text-kiln-600 text-3xl font-bold">¥{feeData.totalFee.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-pottery-50 rounded-lg p-3 text-xs text-pottery-400">
                  <p>* 费用仅供参考，以实际结算为准</p>
                  <p>* 免费寄存30天，超期按5元/天计费</p>
                </div>
              </div>
            ) : (
              <p className="text-pottery-300 text-center py-8">请选择参数</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
