import { useState, useEffect } from 'react'
import { AlertTriangle, Search, Flame, ArrowUpDown } from 'lucide-react'
import { fetchBodies, updateBodyStatus } from '@/lib/api'
import type { BodyRecord, BodyStatus, BodySize } from '../../shared/types'
import StatusBadge from '@/components/StatusBadge'

const sizeLabels: Record<string, string> = { small: '小件', medium: '中件', large: '大件' }
const glazeLabels: Record<string, string> = { bisque: '素坯', transparent: '透明釉', colored: '彩釉', crystal: '结晶釉' }

function getStorageDays(createdAt: string): number {
  const start = new Date(createdAt)
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

type SortKey = 'createdAt' | 'size' | 'glazeType'
type SortDir = 'asc' | 'desc'

export default function Management() {
  const [bodies, setBodies] = useState<BodyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<BodyStatus | 'all'>('all')
  const [sizeFilter, setSizeFilter] = useState<BodySize | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await fetchBodies()
      setBodies(data)
    } catch {} finally {
      setLoading(false)
    }
  }

  const activeBodies = bodies.filter(b => b.status === 'stored' || b.status === 'reserved' || b.status === 'firing')

  const expiringCount = activeBodies.filter(b => {
    const days = getStorageDays(b.createdAt)
    return days > 27 && days <= 30
  }).length

  const overdueCount = activeBodies.filter(b => getStorageDays(b.createdAt) > 30).length

  const filtered = activeBodies
    .filter(b => statusFilter === 'all' || b.status === statusFilter)
    .filter(b => sizeFilter === 'all' || b.size === sizeFilter)
    .filter(b => !search || b.bodyNo.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      } else if (sortKey === 'size') {
        const order = { small: 1, medium: 2, large: 3 }
        cmp = order[a.size] - order[b.size]
      } else if (sortKey === 'glazeType') {
        cmp = a.glazeType.localeCompare(b.glazeType)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(b => b.id)))
    }
  }

  const handleBatchFiring = async () => {
    if (selected.size === 0) return
    setBatchLoading(true)
    try {
      await Promise.all(
        Array.from(selected)
          .filter(id => {
            const body = bodies.find(b => b.id === id)
            return body?.status === 'reserved'
          })
          .map(id => updateBodyStatus(id, 'firing'))
      )
      setSelected(new Set())
      await loadData()
    } catch (err: any) {
      alert(err.message || '操作失败')
    } finally {
      setBatchLoading(false)
    }
  }

  const getRowHighlight = (body: BodyRecord) => {
    const days = getStorageDays(body.createdAt)
    if (days > 30) return 'bg-kiln-50 border-l-4 border-l-kiln-400'
    if (days > 27) return 'bg-amber-50 border-l-4 border-l-amber-300'
    return ''
  }

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-pottery-800 mb-6">后台管理</h2>

      {(expiringCount > 0 || overdueCount > 0) && (
        <div className="bg-kiln-50 border border-kiln-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-kiln-500 flex-shrink-0" />
          <div className="text-sm">
            {overdueCount > 0 && <span className="text-kiln-700 font-medium">{overdueCount} 个坯体已超期寄存</span>}
            {overdueCount > 0 && expiringCount > 0 && <span className="text-kiln-400">，</span>}
            {expiringCount > 0 && <span className="text-amber-700 font-medium">{expiringCount} 个坯体即将到期（3天内）</span>}
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-sm text-pottery-500 mr-1">状态:</span>
              {(['all', 'stored', 'reserved', 'firing'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === s ? 'bg-pottery-500 text-white' : 'bg-pottery-50 text-pottery-500 hover:bg-pottery-100'
                  }`}
                >
                  {s === 'all' ? '全部' : s === 'stored' ? '寄存中' : s === 'reserved' ? '已预约' : '烧制中'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-pottery-500 mr-1">尺寸:</span>
              {(['all', 'small', 'medium', 'large'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSizeFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sizeFilter === s ? 'bg-pottery-500 text-white' : 'bg-pottery-50 text-pottery-500 hover:bg-pottery-100'
                  }`}
                >
                  {s === 'all' ? '全部' : sizeLabels[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-pottery-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索编号..."
              className="input-field pl-9 w-48"
            />
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 mb-4 bg-pottery-50 p-3 rounded-lg">
            <span className="text-sm text-pottery-600">已选择 {selected.size} 项</span>
            <button
              onClick={handleBatchFiring}
              disabled={batchLoading}
              className="btn-kiln text-sm py-1.5 px-4 flex items-center gap-1"
            >
              <Flame className="w-3.5 h-3.5" />
              {batchLoading ? '处理中...' : '批量标记烧制中'}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-pottery-400 hover:text-pottery-600"
            >
              取消选择
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-pottery-400 text-center py-8">加载中...</p>
        ) : filtered.length === 0 ? (
          <p className="text-pottery-300 text-center py-8">暂无坯体记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pottery-100">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="rounded border-pottery-300 text-pottery-500 focus:ring-pottery-400"
                    />
                  </th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">编号</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">尺寸</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">釉料</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">顾客</th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">状态</th>
                  <th
                    className="text-left py-3 px-4 text-pottery-500 font-medium cursor-pointer hover:text-pottery-700"
                    onClick={() => handleSort('createdAt')}
                  >
                    <span className="flex items-center gap-1">寄存日期 <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="text-left py-3 px-4 text-pottery-500 font-medium">寄存天数</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((body) => {
                  const days = getStorageDays(body.createdAt)
                  return (
                    <tr key={body.id} className={`border-b border-pottery-50 hover:bg-pottery-50/50 ${getRowHighlight(body)}`}>
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selected.has(body.id)}
                          onChange={() => toggleSelect(body.id)}
                          className="rounded border-pottery-300 text-pottery-500 focus:ring-pottery-400"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono text-pottery-700">{body.bodyNo}</td>
                      <td className="py-3 px-4">{sizeLabels[body.size]}</td>
                      <td className="py-3 px-4">{glazeLabels[body.glazeType]}</td>
                      <td className="py-3 px-4">{body.customerName}</td>
                      <td className="py-3 px-4"><StatusBadge status={body.status} /></td>
                      <td className="py-3 px-4 text-pottery-400 text-xs">{new Date(body.createdAt).toLocaleDateString('zh-CN')}</td>
                      <td className="py-3 px-4">
                        <span className={days > 30 ? 'text-kiln-600 font-medium' : days > 27 ? 'text-amber-600 font-medium' : 'text-pottery-600'}>
                          {days}天
                        </span>
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
