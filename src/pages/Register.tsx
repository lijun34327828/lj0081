import { useState, useEffect } from 'react'
import { Plus, Trash2, Calendar } from 'lucide-react'
import useStore from '@/store/useStore'
import { createBody, updateBodyStatus } from '@/lib/api'
import type { BodySize, GlazeType, BodyStatus, BodyRecord } from '../../shared/types'
import StatusBadge from '@/components/StatusBadge'

const sizeOptions: { value: BodySize; label: string }[] = [
  { value: 'small', label: '小件' },
  { value: 'medium', label: '中件' },
  { value: 'large', label: '大件' },
]

const glazeOptions: { value: GlazeType; label: string }[] = [
  { value: 'bisque', label: '素坯' },
  { value: 'transparent', label: '透明釉' },
  { value: 'colored', label: '彩釉' },
  { value: 'crystal', label: '结晶釉' },
]

const statusFilters: { value: BodyStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'stored', label: '寄存中' },
  { value: 'reserved', label: '已预约' },
  { value: 'firing', label: '烧制中' },
  { value: 'completed', label: '已完成' },
]

function getStorageDays(createdAt: string): number {
  const start = new Date(createdAt)
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function generateBodyNo(bodies: BodyRecord[]): string {
  const today = new Date()
  const dateStr = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0')
  const prefix = `PT${dateStr}`
  const todayBodies = bodies.filter(b => b.bodyNo.startsWith(prefix))
  const seq = todayBodies.length + 1
  return `${prefix}${String(seq).padStart(3, '0')}`
}

export default function Register() {
  const { bodies, fetchBodies, loading } = useStore()
  const [size, setSize] = useState<BodySize>('small')
  const [glazeType, setGlazeType] = useState<GlazeType>('bisque')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [statusFilter, setStatusFilter] = useState<BodyStatus | 'all'>('all')
  const [submitting, setSubmitting] = useState(false)
  const [generatedNo, setGeneratedNo] = useState('')

  useEffect(() => {
    fetchBodies()
  }, [])

  useEffect(() => {
    if (bodies.length >= 0) {
      setGeneratedNo(generateBodyNo(bodies))
    }
  }, [bodies])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim() || !customerPhone.trim()) return
    setSubmitting(true)
    try {
      await createBody({
        bodyNo: generatedNo,
        size,
        glazeType,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
      })
      setCustomerName('')
      setCustomerPhone('')
      setSize('small')
      setGlazeType('bisque')
      await fetchBodies()
    } catch (err: any) {
      alert(err.message || '登记失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此坯体记录吗？')) return
    try {
      await updateBodyStatus(id, 'completed')
      await fetchBodies()
    } catch (err: any) {
      alert(err.message || '操作失败')
    }
  }

  const filteredBodies = statusFilter === 'all' ? bodies : bodies.filter(b => b.status === statusFilter)

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-pottery-800 mb-6">坯体登记</h2>

      <form onSubmit={handleSubmit} className="card mb-6">
        <h3 className="font-serif text-lg font-semibold text-pottery-700 mb-4">新坯体登记</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-pottery-600 mb-1">坯体编号</label>
            <input
              type="text"
              value={generatedNo}
              disabled
              className="input-field bg-pottery-50 text-pottery-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-pottery-600 mb-1">尺寸</label>
            <div className="flex gap-2">
              {sizeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSize(opt.value)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    size === opt.value
                      ? 'bg-pottery-500 text-white shadow-sm'
                      : 'bg-pottery-50 text-pottery-600 hover:bg-pottery-100 border border-pottery-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-pottery-600 mb-1">釉料类型</label>
            <select
              value={glazeType}
              onChange={(e) => setGlazeType(e.target.value as GlazeType)}
              className="select-field"
            >
              {glazeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-pottery-600 mb-1">顾客姓名</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="请输入顾客姓名"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-pottery-600 mb-1">联系电话</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="请输入联系电话"
              className="input-field"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting || !customerName.trim() || !customerPhone.trim()}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {submitting ? '登记中...' : '登记坯体'}
            </button>
          </div>
        </div>
      </form>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-semibold text-pottery-700">坯体列表</h3>
          <div className="flex gap-1">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === f.value
                    ? 'bg-pottery-500 text-white'
                    : 'bg-pottery-50 text-pottery-500 hover:bg-pottery-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-pottery-400 text-center py-8">加载中...</p>
        ) : filteredBodies.length === 0 ? (
          <p className="text-pottery-300 text-center py-8">暂无坯体记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pottery-100">
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">编号</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">尺寸</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">釉料</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">顾客</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">状态</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">寄存天数</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredBodies.map((body) => {
                  const days = getStorageDays(body.createdAt)
                  const sizeLabel = sizeOptions.find(s => s.value === body.size)?.label ?? body.size
                  const glazeLabel = glazeOptions.find(g => g.value === body.glazeType)?.label ?? body.glazeType
                  return (
                    <tr key={body.id} className="border-b border-pottery-50 hover:bg-pottery-50/50">
                      <td className="py-3 px-4 font-mono text-pottery-700">{body.bodyNo}</td>
                      <td className="py-3 px-4">{sizeLabel}</td>
                      <td className="py-3 px-4">{glazeLabel}</td>
                      <td className="py-3 px-4">{body.customerName}</td>
                      <td className="py-3 px-4"><StatusBadge status={body.status} /></td>
                      <td className="py-3 px-4">
                        <span className={days > 30 ? 'text-kiln-600 font-medium' : 'text-pottery-600'}>{days}天</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {body.status === 'stored' && (
                            <a href="/reservation" className="text-pottery-500 hover:text-kiln-500 flex items-center gap-1 text-xs">
                              <Calendar className="w-3.5 h-3.5" />预约
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(body.id)}
                            className="text-pottery-300 hover:text-kiln-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
